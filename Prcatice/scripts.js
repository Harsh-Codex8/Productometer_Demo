// ==========================================
// STATE MANAGEMENT & STORAGE INITIALIZATION
// ==========================================
const STORAGE_KEY = 'productometer_chrono_planner_list';
let plannerListData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

let selectedTaskIdForEditing = null;

// Task Presets Registry
const presetRegistry = {
    academics: ["ASSIGNMENT", "EXAM PREP", "LECTURE", "STUDY SESSION", "CODING PRACTICE"],
    skills: ["GUITAR PRACTICE", "TYPING DRILL", "LANGUAGE LESSON", "DESIGN SKETCHING", "WRITING"],
    health: ["WORKOUT", "MEDITATION", "RUNNING", "STRETCHING", "NUTRITION PLAN"]
};

const colorRegistry = {
    academics: '#00e5ff',
    skills: '#ffb300',
    health: '#00e676'
};

let currentActiveCategory = 'academics';
let selectedTaskTitle = presetRegistry.academics[0];

// Drum Selection State Variables
let selectedStartHour = 8;
let selectedStartMin = 0;
let selectedDurHours = 1;
let selectedDurMins = 0;

// DOM Element Bindings
const plannerTaskBucket = document.getElementById('plannerTaskBucket');
const masterNeonFillTrack = document.getElementById('masterNeonFillTrack');
const taskBuilderModalOverlay = document.getElementById('taskBuilderModalOverlay');
const taskModalTitle = document.getElementById('taskModalTitle');
const commitTaskToPlannerBtn = document.getElementById('commitTaskToPlannerBtn');
const taskInputDescription = document.getElementById('taskInputDescription');
const taskAlarmCheckbox = document.getElementById('taskAlarmCheckbox');
const taskAlarmAudio = document.getElementById('taskAlarmAudio');

// ==========================================
// BUILDER DRUM WHEELS SETUP
// ==========================================
function populateDrumWheels() {
    // Hours (0 to 23)
    const hTrack = document.getElementById('startHourTrack');
    hTrack.innerHTML = '';
    for (let i = 0; i < 24; i++) {
        const tick = document.createElement('div');
        tick.className = `wheel-tick-node ${i === selectedStartHour ? 'selected-time' : ''}`;
        tick.textContent = String(i).padStart(2, '0');
        hTrack.appendChild(tick);
    }

    // Minutes (5-min intervals)
    const mTrack = document.getElementById('startMinTrack');
    mTrack.innerHTML = '';
    for (let i = 0; i < 60; i += 5) {
        const tick = document.createElement('div');
        tick.className = `wheel-tick-node ${i === selectedStartMin ? 'selected-time' : ''}`;
        tick.textContent = String(i).padStart(2, '0');
        mTrack.appendChild(tick);
    }

    // Duration Hours (0 to 12)
    const dhTrack = document.getElementById('durHoursTrack');
    dhTrack.innerHTML = '';
    for (let i = 0; i <= 12; i++) {
        const tick = document.createElement('div');
        tick.className = `wheel-tick-node ${i === selectedDurHours ? 'selected-time' : ''}`;
        tick.textContent = i;
        dhTrack.appendChild(tick);
    }

    // Duration Minutes (0, 15, 30, 45)
    const dmTrack = document.getElementById('durMinsTrack');
    dmTrack.innerHTML = '';
    for (let i = 0; i < 60; i += 15) {
        const tick = document.createElement('div');
        tick.className = `wheel-tick-node ${i === selectedDurMins ? 'selected-time' : ''}`;
        tick.textContent = String(i).padStart(2, '0');
        dmTrack.appendChild(tick);
    }
}

// Scroll Listeners for Wheels Snap Synchronization
function setupDrumScrollListeners() {
    setupWheel('startHourWheel', 24, (val) => { selectedStartHour = val; updateDrumVisuals('startHourWheel', val); });
    setupWheel('startMinWheel', 12, (val) => { selectedStartMin = val * 5; updateDrumVisuals('startMinWheel', val); });
    setupWheel('durHoursWheel', 13, (val) => { selectedDurHours = val; updateDrumVisuals('durHoursWheel', val); });
    setupWheel('durMinsWheel', 4, (val) => { selectedDurMins = val * 15; updateDrumVisuals('durMinsWheel', val); });
}

function setupWheel(elementId, itemCount, callback) {
    const container = document.getElementById(elementId);
    if (!container) return;
    let scrollTimeout;
    container.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            const index = Math.round(container.scrollTop / 38);
            const clampedIndex = Math.max(0, Math.min(index, itemCount - 1));
            callback(clampedIndex);
        }, 50);
    });
}

function updateDrumVisuals(elementId, selectedIdx) {
    const container = document.getElementById(elementId);
    if (!container) return;
    Array.from(container.querySelectorAll('.wheel-tick-node')).forEach((node, idx) => {
        if (idx === selectedIdx) {
            node.classList.add('selected-time');
        } else {
            node.classList.remove('selected-time');
        }
    });
}

function scrollToDrumValue(elementId, targetVal, step = 1) {
    const container = document.getElementById(elementId);
    if (container) {
        container.scrollTop = (targetVal / step) * 38;
    }
}

// ==========================================
// CATEGORY & PRESET TABS ENGINE
// ==========================================
function renderPresetButtons(category) {
    const row = document.getElementById('taskPresetButtonsRow');
    if (!row) return;
    row.innerHTML = '';
    
    const presets = presetRegistry[category] || [];
    presets.forEach((preset, idx) => {
        const btn = document.createElement('button');
        btn.textContent = preset;
        if (idx === 0) {
            btn.className = 'active-preset-highlight';
            selectedTaskTitle = preset;
        }
        btn.addEventListener('click', () => {
            Array.from(row.querySelectorAll('button')).forEach(b => b.className = '');
            btn.className = 'active-preset-highlight';
            selectedTaskTitle = preset;
        });
        row.appendChild(btn);
    });

    // Custom task button handler
    const customBtn = document.createElement('button');
    customBtn.className = 'custom-task-btn';
    customBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Custom';
    customBtn.addEventListener('click', () => {
        Array.from(row.querySelectorAll('button')).forEach(b => b.className = '');
        customBtn.className = 'custom-task-btn active-preset-highlight';
        selectedTaskTitle = taskInputDescription.value.trim() || 'CUSTOM TASK';
    });
    row.appendChild(customBtn);
}

// Tab Switching Setup
document.querySelectorAll('#taskTypeTabs .type-tab-btn').forEach(tab => {
    tab.addEventListener('click', (e) => {
        document.querySelectorAll('#taskTypeTabs .type-tab-btn').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentActiveCategory = tab.getAttribute('data-type');
        
        // Update container aura styling
        const containers = [document.getElementById('startTimeDrumContainer'), document.getElementById('durationDrumContainer')];
        containers.forEach(c => {
            if (c) {
                c.className = `skeuo-3d-drum-container ${currentActiveCategory}-glow-aura`;
            }
        });

        renderPresetButtons(currentActiveCategory);
    });
});

// ==========================================
// OVERLAP & 5-MINUTE GAP VALIDATION LOGIC
// ==========================================
function validateTimeOverlap(newStartMin, newDurationMin, currentEditingId = null) {
    const newEndMin = newStartMin + newDurationMin;
    
    for (let task of plannerListData) {
        if (currentEditingId && task.id === currentEditingId) continue;
        
        const existingStart = task.startMin;
        const existingEnd = task.startMin + task.durationMin;
        
        // Rule: Consecutive tasks must maintain a mandatory 5-minute gap
        const overlap = (newStartMin < existingEnd + 5) && (newEndMin + 5 > existingStart);
        if (overlap) {
            return {
                isValid: false,
                conflictingTask: task.title,
                requiredMinStart: existingEnd + 5
            };
        }
    }
    return { isValid: true };
}

// ==========================================
// DIALOG MODAL CONTROLLERS (ADD & EDIT)
// ==========================================
document.getElementById('openAddTaskModalBtn').addEventListener('click', () => {
    selectedTaskIdForEditing = null;
    if (taskModalTitle) taskModalTitle.textContent = "✨ Add New Task";
    if (commitTaskToPlannerBtn) commitTaskToPlannerBtn.innerHTML = '<i class="fa-solid fa-plus-circle"></i> Commit Task to Planner';
    if (taskInputDescription) taskInputDescription.value = '';
    if (taskAlarmCheckbox) taskAlarmCheckbox.checked = false;
    
    selectedStartHour = 8;
    selectedStartMin = 0;
    selectedDurHours = 1;
    selectedDurMins = 0;
    
    populateDrumWheels();
    scrollToDrumValue('startHourWheel', 8);
    scrollToDrumValue('startMinWheel', 0);
    scrollToDrumValue('durHoursWheel', 1);
    scrollToDrumValue('durMinsWheel', 0);

    taskBuilderModalOverlay.classList.remove('hidden');
});

document.getElementById('openEditTaskModalBtn').addEventListener('click', () => {
    if (!selectedTaskIdForEditing) {
        alert("Please double-click or long-press a task card first to select it for editing.");
        return;
    }

    const taskToEdit = plannerListData.find(t => t.id === selectedTaskIdForEditing);
    if (!taskToEdit) return;

    selectedTaskIdForEditing = taskToEdit.id;
    if (taskModalTitle) taskModalTitle.textContent = "📝 Edit Task Details";
    if (commitTaskToPlannerBtn) commitTaskToPlannerBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Task Changes';
    if (taskInputDescription) taskInputDescription.value = taskToEdit.description || '';
    if (taskAlarmCheckbox) taskAlarmCheckbox.checked = !!taskToEdit.hasAlarm;

    currentActiveCategory = taskToEdit.category || 'academics';
    selectedTaskTitle = taskToEdit.title;

    // Highlight correct category tab
    document.querySelectorAll('#taskTypeTabs .type-tab-btn').forEach(t => {
        if (t.getAttribute('data-type') === currentActiveCategory) {
            t.classList.add('active');
        } else {
            t.classList.remove('active');
        }
    });
    renderPresetButtons(currentActiveCategory);

    // Set time drums from minutes
    selectedStartHour = Math.floor(taskToEdit.startMin / 60);
    selectedStartMin = taskToEdit.startMin % 60;
    selectedDurHours = Math.floor(taskToEdit.durationMin / 60);
    selectedDurMins = taskToEdit.durationMin % 60;

    populateDrumWheels();
    scrollToDrumValue('startHourWheel', selectedStartHour);
    scrollToDrumValue('startMinWheel', selectedStartMin / 5);
    scrollToDrumValue('durHoursWheel', selectedDurHours);
    scrollToDrumValue('durMinsWheel', selectedDurMins / 15);

    taskBuilderModalOverlay.classList.remove('hidden');
});

function closeTaskBuilderModal() {
    taskBuilderModalOverlay.classList.add('hidden');
}

// ==========================================
// COMMIT TASK LOGIC (ADD / EDIT)
// ==========================================
commitTaskToPlannerBtn.addEventListener('click', () => {
    const customDesc = taskInputDescription ? taskInputDescription.value.trim() : '';
    const finalTitle = customDesc ? customDesc.toUpperCase() : selectedTaskTitle.toUpperCase();
    
    const totalStartMin = (selectedStartHour * 60) + selectedStartMin;
    const totalDurMin = (selectedDurHours * 60) + selectedDurMins;

    if (totalDurMin <= 0) {
        alert("Task duration must be greater than 0 minutes.");
        return;
    }

    // Check overlap & 5 min gap rule
    const overlapCheck = validateTimeOverlap(totalStartMin, totalDurMin, selectedTaskIdForEditing);
    if (!overlapCheck.isValid) {
        const reqH = Math.floor(overlapCheck.requiredMinStart / 60).toString().padStart(2, '0');
        const reqM = (overlapCheck.requiredMinStart % 60).toString().padStart(2, '0');
        alert(`⚠️ Time Conflict! Conflicts with "${overlapCheck.conflictingTask}". Must maintain a 5-minute gap. Earliest valid start time is ${reqH}:${reqM}.`);
        return;
    }

    const timeStr = `${String(selectedStartHour).padStart(2, '0')}:${String(selectedStartMin).padStart(2, '0')}`;
    const hasAlarmSet = taskAlarmCheckbox ? taskAlarmCheckbox.checked : false;

    if (selectedTaskIdForEditing) {
        // Update Existing Task
        const index = plannerListData.findIndex(t => t.id === selectedTaskIdForEditing);
        if (index !== -1) {
            plannerListData[index] = {
                ...plannerListData[index],
                title: finalTitle,
                category: currentActiveCategory,
                color: colorRegistry[currentActiveCategory],
                startMin: totalStartMin,
                durationMin: totalDurMin,
                timeDisplayStr: timeStr,
                description: customDesc,
                hasAlarm: hasAlarmSet,
                alarmTriggered: false
            };
        }
    } else {
        // Add New Task
        const newTask = {
            id: 'chrono_' + Date.now(),
            title: finalTitle,
            category: currentActiveCategory,
            color: colorRegistry[currentActiveCategory],
            startMin: totalStartMin,
            durationMin: totalDurMin,
            timeDisplayStr: timeStr,
            description: customDesc,
            hasAlarm: hasAlarmSet,
            alarmTriggered: false
        };
        plannerListData.push(newTask);
    }

    // Chronologically sort
    plannerListData.sort((a, b) => a.startMin - b.startMin);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plannerListData));

    renderChronologicalMasterTimelineGrid();
    closeTaskBuilderModal();
    selectedTaskIdForEditing = null;
});

// ==========================================
// ALARM MONITORING ENGINE (5 MINS BEFORE)
// ==========================================
setInterval(() => {
    if (!plannerListData || plannerListData.length === 0) return;

    const now = new Date();
    const currentTotalMin = (now.getHours() * 60) + now.getMinutes();

    plannerListData.forEach(task => {
        if (task.hasAlarm && !task.alarmTriggered) {
            const alarmTriggerTime = task.startMin - 5; // 5 minutes before task starts
            if (currentTotalMin === alarmTriggerTime) {
                task.alarmTriggered = true;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(plannerListData));
                
                if (taskAlarmAudio) {
                    taskAlarmAudio.play().catch(err => console.log("Audio autoplay restricted:", err));
                }
            }
        }
    });
}, 10000); // Check every 10 seconds

// ==========================================
// RENDER MASTER TIMELINE & TASK CARDS
// ==========================================
function renderChronologicalMasterTimelineGrid() {
    if (!plannerTaskBucket || !masterNeonFillTrack) return;
    plannerTaskBucket.innerHTML = '';
    masterNeonFillTrack.innerHTML = '';

    if (plannerListData.length === 0) {
        plannerTaskBucket.innerHTML = `<p class="todo-empty-placeholder">Your Day Planner track is empty.</p>`;
        return;
    }

    plannerListData.forEach(task => {
        const card = document.createElement('div');
        card.classList.add('chrono-task-card');
        if (selectedTaskIdForEditing === task.id) {
            card.classList.add('selected-for-editing');
        }
        card.style.borderColor = task.color + '55';

        card.innerHTML = `
            <div class="card-time-badge" style="color: ${task.color}; border-color: ${task.color}33;">${task.timeDisplayStr}</div>
            <div class="card-info-stack">
                <div class="card-main-title">${task.title} ${task.hasAlarm ? '<i class="fa-solid fa-bell" style="color:#00e5ff; font-size:0.75rem; margin-left:6px;" title="Alarm Set"></i>' : ''}</div>
                <div class="card-sub-description">${task.description || 'No description provided'} (${(task.durationMin/60).toFixed(1)}h)</div>
            </div>
            <button class="delete-chrono-item-btn" title="Delete Task">&times;</button>
        `;

        // Double Click / Long Press Selection Trigger
        card.addEventListener('dblclick', () => {
            selectTaskForEditing(task.id);
        });

        let pressTimer;
        card.addEventListener('touchstart', () => {
            pressTimer = setTimeout(() => {
                selectTaskForEditing(task.id);
                navigator.vibrate?.(50);
            }, 600); // 600ms long press
        });
        card.addEventListener('touchend', () => clearTimeout(pressTimer));

        card.querySelector('.delete-chrono-item-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            if (selectedTaskIdForEditing === task.id) {
                selectedTaskIdForEditing = null;
            }
            plannerListData = plannerListData.filter(t => t.id !== task.id);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(plannerListData));
            renderChronologicalMasterTimelineGrid();
        });

        plannerTaskBucket.appendChild(card);

        // Master Timeline Progress Bar Segment
        const left = (task.startMin / 1440) * 100;
        const width = (task.durationMin / 1440) * 100;
        const segment = document.createElement('div');
        segment.classList.add('chrono-color-segment');
        segment.style.left = `${left}%`;
        segment.style.width = `${width}%`;
        segment.style.backgroundColor = task.color;
        segment.style.boxShadow = `0 0 15px ${task.color}, inset 0 0 6px rgba(0,0,0,0.3)`;
        masterNeonFillTrack.appendChild(segment);
    });
}

function selectTaskForEditing(taskId) {
    selectedTaskIdForEditing = (selectedTaskIdForEditing === taskId) ? null : taskId;
    renderChronologicalMasterTimelineGrid();
}

// Initialize App on Load
renderPresetButtons('academics');
populateDrumWheels();
setupDrumScrollListeners();
renderChronologicalMasterTimelineGrid();