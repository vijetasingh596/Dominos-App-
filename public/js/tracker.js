// Domino's Live Pizza Tracker Script

const TRACKER_STAGES = [
  { key: 'order_placed', label: 'Order Confirmed', icon: '📝', desc: 'Received & acknowledged by store' },
  { key: 'preparing', label: 'In the Kitchen', icon: '👨‍🍳', desc: 'Crafting fresh dough and topping sauces' },
  { key: 'baking', label: 'In the Oven', icon: '🔥', desc: 'Baking at 245°C for that golden melt' },
  { key: 'quality_check', label: 'Quality Check', icon: '📦', desc: 'Inspecting crust perfection & boxing' },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: '🛵', desc: 'Hot-bag delivery rider en route' },
  { key: 'delivered', label: 'Delivered', icon: '🎉', desc: 'Delivered hot & fresh. Enjoy!' }
];

let trackerPollInterval = null;

function initTracker(orderId, initialStatus) {
  updateTrackerUI(initialStatus);

  // Poll for updates every 4 seconds
  trackerPollInterval = setInterval(async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`);
      const data = await res.json();
      if (data.success) {
        updateTrackerUI(data.status);
        if (data.status === 'delivered') {
          clearInterval(trackerPollInterval);
        }
      }
    } catch (err) {
      console.error('Tracker poll error:', err);
    }
  }, 4000);
}

function updateTrackerUI(currentStatus) {
  const currentIdx = TRACKER_STAGES.findIndex(s => s.key === currentStatus);
  if (currentIdx === -1) return;

  // Calculate percentage
  const fillPct = (currentIdx / (TRACKER_STAGES.length - 1)) * 100;
  const fillBar = document.getElementById('stepper-progress-fill');
  if (fillBar) {
    fillBar.style.width = `${fillPct}%`;
  }

  // Update nodes
  TRACKER_STAGES.forEach((stage, idx) => {
    const nodeEl = document.getElementById(`step-node-${stage.key}`);
    if (!nodeEl) return;

    nodeEl.classList.remove('completed', 'active');

    if (idx < currentIdx) {
      nodeEl.classList.add('completed');
    } else if (idx === currentIdx) {
      nodeEl.classList.add('active');
    }
  });

  // Update live message banner
  const activeStage = TRACKER_STAGES[currentIdx];
  const bannerText = document.getElementById('tracker-current-status-text');
  const bannerDesc = document.getElementById('tracker-current-status-desc');
  if (bannerText) bannerText.textContent = activeStage.label;
  if (bannerDesc) bannerDesc.textContent = activeStage.desc;
}

// Interactive Simulation for evaluation
async function triggerSimulateNext(orderId) {
  try {
    const res = await fetch(`/admin/orders/${orderId}/simulate-next`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (data.success) {
      updateTrackerUI(data.nextStatus);
      showToast(`Tracker advanced to: ${data.nextStatus.replace('_', ' ').toUpperCase()}`, 'success');
    }
  } catch (err) {
    console.error('Simulation error:', err);
  }
}
