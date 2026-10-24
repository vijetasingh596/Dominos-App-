/**
 * Native Salesforce REST API Integration Service for Domino's Pizza App
 * Uses built-in Node.js fetch with Zero External Dependencies.
 * Compatible with all Node.js 18+ and 22+ versions.
 */

require('dotenv').config();

class SalesforceService {
  constructor() {
    this.accessToken = null;
    this.instanceUrl = null;
    this.isEnabled = process.env.SALESFORCE_ENABLED === 'true';
    this.loginUrl = process.env.SF_LOGIN_URL || 'https://login.salesforce.com';
    this.apiVersion = process.env.SF_API_VERSION || 'v60.0';
    this.username = process.env.SF_USERNAME;
    this.password = process.env.SF_PASSWORD;
    this.securityToken = process.env.SF_SECURITY_TOKEN || '';
    this.clientId = process.env.SF_CLIENT_ID;
    this.clientSecret = process.env.SF_CLIENT_SECRET;
  }

  /**
   * Authenticate with Salesforce via SOAP Login (Username + Password + Security Token)
   * This does NOT require a Connected App or OAuth consumer key.
   */
  async authenticate() {
    if (!this.isEnabled) {
      console.log('ℹ️ Salesforce Integration in STANDBY mode (SALESFORCE_ENABLED=false).');
      return false;
    }

    if (this.accessToken && this.instanceUrl) {
      return true;
    }

    try {
      const soapBody = `<?xml version="1.0" encoding="utf-8" ?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:urn="urn:partner.soap.sforce.com">
  <soapenv:Body>
    <urn:login>
      <urn:username>${this.username}</urn:username>
      <urn:password>${this.password}${this.securityToken}</urn:password>
    </urn:login>
  </soapenv:Body>
</soapenv:Envelope>`;

      const res = await fetch(`${this.loginUrl}/services/Soap/u/${this.apiVersion.replace('v', '')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=UTF-8',
          'SOAPAction': '""'
        },
        body: soapBody
      });

      const xml = await res.text();
      if (xml.includes('<sessionId>')) {
        this.accessToken = xml.match(/<sessionId>(.*?)<\/sessionId>/)[1];
        const sUrl = xml.match(/<serverUrl>(.*?)<\/serverUrl>/)[1];
        this.instanceUrl = sUrl.split('/services')[0];
        console.log(`✅ Authenticated with Salesforce! Instance URL: ${this.instanceUrl}`);
        return true;
      } else {
        const fault = xml.match(/<faultstring>(.*?)<\/faultstring>/);
        console.error('❌ Salesforce Login Fault:', fault ? fault[1] : xml);
        return false;
      }
    } catch (err) {
      console.error('❌ Salesforce authentication error:', err.message);
      return false;
    }
  }

  /**
   * Map Customer to Salesforce Contact / Account
   * @param {Object} user 
   */
  async syncCustomer(user) {
    const names = (user.name || '').trim().split(' ');
    const firstName = names.length > 1 ? names[0] : '';
    const lastName = names.length > 1 ? names.slice(1).join(' ') : (names[0] || 'Customer');
    const primaryAddress = user.addresses?.[0] || {};

    const sfContactData = {
      FirstName: firstName,
      LastName: lastName,
      Email: user.email,
      Phone: user.phone,
      MailingStreet: [primaryAddress.flat, primaryAddress.area].filter(Boolean).join(', '),
      MailingCity: primaryAddress.city || 'Bengaluru',
      MailingPostalCode: primaryAddress.pincode || '',
      Description: `Domino's Web App Customer. External ID: ${user.id}`
    };

    if (!this.isEnabled) {
      console.log(`[Salesforce Ready] Contact payload formatted for ${user.email}:`, sfContactData);
      return {
        success: true,
        mode: 'STANDBY_MOCKED',
        salesforceId: 'SF-CONT-' + Math.floor(100000 + Math.random() * 900000),
        payload: sfContactData
      };
    }

    try {
      const authenticated = await this.authenticate();
      if (!authenticated) throw new Error('Salesforce authentication failed');

      // Upsert Contact via Salesforce REST API
      const url = `${this.instanceUrl}/services/data/${this.apiVersion}/sobjects/Contact`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sfContactData)
      });

      const result = await response.json();
      if (!response.ok) throw new Error(JSON.stringify(result));

      console.log(`✅ Salesforce Contact created: ID ${result.id}`);
      return { success: true, salesforceId: result.id };
    } catch (err) {
      console.error('Failed to sync Customer to Salesforce:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Map Order & Order Items to Salesforce
   * @param {Object} order 
   */
  async syncOrder(order) {
    const sfOrderData = {
      Order_Id__c: order.id,
      Customer_Name__c: order.customerName,
      Customer_Email__c: order.customerEmail,
      Customer_Phone__c: order.customerPhone,
      Delivery_Street__c: `${order.address.flat}, ${order.address.area}`,
      Delivery_City__c: order.address.city,
      Delivery_Postal_Code__c: order.address.pincode,
      Order_Status__c: order.status,
      Payment_Method__c: order.paymentMethod,
      Payment_Status__c: order.paymentStatus,
      Subtotal__c: order.pricing.subtotal,
      Discount_Amount__c: order.pricing.discount,
      Delivery_Fee__c: order.pricing.deliveryFee,
      Tax_Amount__c: order.pricing.gst,
      Total_Amount__c: order.pricing.grandTotal,
      Coupon_Code__c: order.pricing.couponCode || '',
      Special_Instructions__c: order.instructions || '',
      Order_Date_Time__c: order.createdAt
    };

    const sfLineItems = order.items.map((it, idx) => ({
      Order_Id__c: order.id,
      Item_Index__c: idx + 1,
      Product_Code__c: it.id,
      Product_Name__c: it.name,
      Category_Veg__c: it.isVeg,
      Size__c: it.sizeName,
      Crust__c: it.crustName,
      Extra_Cheese__c: !!it.extraCheese,
      Quantity__c: it.quantity,
      Unit_Price__c: it.unitPrice,
      Total_Price__c: it.itemTotal
    }));

    if (!this.isEnabled) {
      console.log(`[Salesforce Ready] Order #${order.id} formatted for Salesforce:`, {
        order: sfOrderData,
        lineItemsCount: sfLineItems.length
      });
      return {
        success: true,
        mode: 'STANDBY_MOCKED',
        salesforceOrderId: 'SF-ORD-' + Math.floor(100000 + Math.random() * 900000),
        sfOrderData,
        sfLineItems
      };
    }

    try {
      const authenticated = await this.authenticate();
      if (!authenticated) throw new Error('Salesforce authentication failed');

      // Create Order Header in Salesforce
      const orderUrl = `${this.instanceUrl}/services/data/${this.apiVersion}/sobjects/Pizza_Order__c`;
      const resOrder = await fetch(orderUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sfOrderData)
      });

      const orderResult = await resOrder.json();
      if (!resOrder.ok) throw new Error(JSON.stringify(orderResult));

      // Create Line Items
      for (const item of sfLineItems) {
        item.Pizza_Order__c = orderResult.id;
        await fetch(`${this.instanceUrl}/services/data/${this.apiVersion}/sobjects/Pizza_Order_Item__c`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(item)
        });
      }

      console.log(`✅ Salesforce Order Synced: ID ${orderResult.id}`);
      return { success: true, salesforceOrderId: orderResult.id };
    } catch (err) {
      console.error('Failed to sync Order to Salesforce:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Sync Menu items to Salesforce Product2
   * @param {Array} pizzas 
   */
  async syncMenuCatalog(pizzas) {
    const products = pizzas.map(p => ({
      ProductCode: p.id,
      Name: p.name,
      Family: p.isVeg ? 'Veg Pizza' : (p.category === 'desserts' ? 'Dessert' : (p.category === 'beverages' ? 'Beverage' : 'Non-Veg Pizza')),
      Description: p.tagline || p.description,
      IsActive: true
    }));

    if (!this.isEnabled) {
      console.log(`[Salesforce Ready] Prepared ${products.length} Products for Salesforce Product2 sync.`);
      return { success: true, mode: 'STANDBY_MOCKED', count: products.length };
    }

    try {
      const authenticated = await this.authenticate();
      if (!authenticated) throw new Error('Salesforce authentication failed');

      for (const prod of products) {
        await fetch(`${this.instanceUrl}/services/data/${this.apiVersion}/sobjects/Product2`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(prod)
        });
      }

      return { success: true, count: products.length };
    } catch (err) {
      console.error('Failed to sync menu to Salesforce:', err.message);
      return { success: false, error: err.message };
    }
  }
}

module.exports = new SalesforceService();
