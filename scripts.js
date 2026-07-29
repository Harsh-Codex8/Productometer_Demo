document.addEventListener('DOMContentLoaded', () => {
    // 1. Structural UI HUD Mapping Nodes
    const globalDiamondWallet = document.getElementById('globalDiamondWallet');

    // Load master wallet cache values from browser sandbox memory lane blocks
    let diamondCount = parseInt(localStorage.getItem('productometer_diamond_wallet')) || 0;
    if (globalDiamondWallet) globalDiamondWallet.textContent = diamondCount;

    // --- 📊 RESPONSIVE LIVE METRICS EXTRACTOR CONTROLLER ---
    function syncFeatureCardLiveMetrics() {
        const savedTimeline = localStorage.getItem('productometer_timeline');
        const timelineData = savedTimeline ? JSON.parse(savedTimeline) : Array(48).fill(null);
        
        const savedTodoList = localStorage.getItem('productometer_slider_free_todolist');
        const todoListData = savedTodoList ? JSON.parse(savedTodoList) : [];

        let totalTrackedSlots = 0;
        let screenSlots = 0;
        let academicsSlots = 0;

        timelineData.forEach(item => {
            if (item && item !== 'eraser') totalTrackedSlots++;
            if (item === 'screen') screenSlots++;
            if (item === 'academics') academicsSlots++;
        });

        if (document.getElementById('metric-planner')) {
            document.getElementById('metric-planner').textContent = `${totalTrackedSlots}/48 Slots`;
        }
        if (document.getElementById('metric-academics')) {
            document.getElementById('metric-academics').textContent = academicsSlots > 0 ? `${(academicsSlots * 0.5).toFixed(1)}h Studied` : "Ready";
        }
        if (document.getElementById('metric-screen')) {
            const hours = screenSlots * 0.5;
            document.getElementById('metric-screen').textContent = `${hours.toFixed(1)}h Screen`;
            if (hours >= 4.0) document.getElementById('metric-screen').classList.add('text-warn');
            else document.getElementById('metric-screen').classList.remove('text-warn');
        }
        if (document.getElementById('metric-tasks')) {
            const remainingOpenTasksCount = todoListData.filter(t => !t.completed).length;
            document.getElementById('metric-tasks').textContent = `${remainingOpenTasksCount} Tasks Open`;
        }
        if (document.getElementById('metric-health')) {
            document.getElementById('metric-health').textContent = "Ready";
        }
    }

    syncFeatureCardLiveMetrics();

    // --- 🚀 BULLETPROOF INWARD FEATURE NAVIGATION CONTROLLER (SINGLE CLEAN LOOP TRACK) ---
    document.querySelectorAll('.feature-launcher-card').forEach(card => {
        card.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            
            // Extract the targeting identifier signature safely
            let folderIdentifier = card.dataset.target;
            
            // 🎯 DIRECT CASE ROUTING REPAIR RECTIFICATION: Locks straight to your custom filenames
            if (folderIdentifier === "Day_Planner" || folderIdentifier === "Day Planner") {
                window.location.href = "./Day Planner/planner-index.html";
                return; // Safely exit routing sequence branch paths
            }

            if (folderIdentifier === "Academics_Monitoring") {
                window.location.href = "./Academics_Monitoring/index.html";
                return;
            }

            // Standard fallback path directory router engine parameters for other module zones
            if (folderIdentifier) {
                window.location.href = `./${folderIdentifier}/index.html`;
            }
        });
    });
    if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registered successfully!', reg.scope))
            .catch(err => console.error('Service Worker registration failed:', err));
    });
}
});
