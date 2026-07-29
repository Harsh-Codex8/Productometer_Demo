// ========================================================
// PRODUCTOMETER CHRONO PLANNER & TASK BUILDER ENGINE
// ========================================================

// --- GLOBAL STATE VARIABLES ---
let currentSelectedCategoryType = 'academics';
let currentStagedTaskTitle = '';
let activeStartHour = '09';
let activeStartMinute = '00';
let activeDurationHour = '01';
let activeDurationMinute = '00';

let plannerListData = JSON.parse(localStorage.getItem('productometer_chrono_planner_list')) || [];
// --- 🌙 AUTOMATIC MIDNIGHT RESET HANDLER ---
function checkAndResetPlannerForNewDay() {
    const lastActiveDateKey = 'productometer_last_active_date';
    const currentDateStr = new Date().toDateString(); // e.g., "Mon Jul 27 2026"
    
    const lastSavedDate = localStorage.getItem(lastActiveDateKey);

    if (lastSavedDate && lastSavedDate !== currentDateStr) {
        // A new day has begun! Clear yesterday's schedule
        plannerListData = [];
        localStorage.removeItem('productometer_chrono_planner_list');
        synchronizeLegacyTimelineArray();
        renderChronologicalMasterTimelineGrid();
    }

    // Update the stored active date to today
    localStorage.setItem(lastActiveDateKey, currentDateStr);
}

// Call this right when your page loads or your scripts initialize
checkAndResetPlannerForNewDay();
// Persistent Custom Tasks Storage Setup
let permanentCustomTasks = JSON.parse(localStorage.getItem('productometer_permanent_custom_tasks')) || {
    academics: [],
    skills: [],
    health: [],
    other: []
};

const baseColors = {
    academics: '#00e5ff',
    skills: '#ffb300',
    health: '#00e676',
    other: '#d500f9'
};

const extendedPalette = ['#ff5252', '#7c4dff', '#00bcd4', '#ff4081', '#69f0ae', '#e040fb', '#18ffff'];

// --- DOM ELEMENT REFERENCES ---
const openTaskDialogBtn = document.getElementById('openTaskDialogBtn');
const taskBuilderDialog = document.getElementById('taskBuilderDialog');
const taskDescriptionInput = document.getElementById('taskDescriptionInput');
const addToPlannerBtn = document.getElementById('addToPlannerBtn');
const plannerTaskBucket = document.getElementById('plannerTaskBucket');
const masterNeonFillTrack = document.getElementById('masterNeonFillTrack');

const wheelStartHours = document.getElementById('wheelStartHours');
const wheelStartMinutes = document.getElementById('wheelStartMinutes');
const wheelDurationHours = document.getElementById('wheelDurationHours');
const wheelDurationMinutes = document.getElementById('wheelDurationMinutes');

const customTaskModal = document.getElementById('customTaskModal');
const customTaskTitleInput = document.getElementById('customTaskTitleInput');
const savePermanentCheckbox = document.getElementById('savePermanentCheckbox');
const taskConfirmBtn = document.getElementById('taskConfirmBtn');
const taskCancelBtn = document.getElementById('taskCancelBtn');

// --- INITIALIZATION ON LOAD ---
document.addEventListener('DOMContentLoaded', () => {
    rebuildCategoryPresetButtons();
    renderChronologicalMasterTimelineGrid();
    setupCategoryTabs();
});

// --- 🗂️ DIALOG OPEN/CLOSE HANDLERS ---
if (openTaskDialogBtn && taskBuilderDialog) {
    openTaskDialogBtn.addEventListener('click', () => {
        taskBuilderDialog.showModal();
        setTimeout(() => {
            initializeTouchDrumsMatrix();
        }, 50);
    });
}

// --- 🗂️ CATEGORY TABS SWITCHING LOGIC ---
function setupCategoryTabs() {
    const tabButtons = document.querySelectorAll('.type-tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const targetType = btn.dataset.type;
            currentSelectedCategoryType = targetType;

            // Hide all sub-button rows, show selected
            document.querySelectorAll('.sub-buttons-row').forEach(row => {
                row.style.display = 'none';
            });
            const targetRow = document.getElementById(`options-${targetType}`);
            if (targetRow) targetRow.style.display = 'flex';
        });
    });
}


// --- 🌀 INFINITE DRUM WHEELS MATRIX ENGINE (FIXED REVERSE SCROLLING) ---
function initializeTouchDrumsMatrix() {
    buildDrumTrackNodes(wheelStartHours, 24, 'sh');
    buildDrumTrackNodes(wheelStartMinutes, 60, 'sm', 5);
    buildDrumTrackNodes(wheelDurationHours, 24, 'dh');
    buildDrumTrackNodes(wheelDurationMinutes, 60, 'dm', 5);
}

function buildDrumTrackNodes(wheelContainer, totalSlots, type, intervals = 1) {
    if (!wheelContainer) return;
    const track = wheelContainer.querySelector('.wheel-scroll-track-drum');
    track.innerHTML = "";
    
    const virtualMultipliersCount = 4;
    const totalVirtualNodesCount = totalSlots * virtualMultipliersCount;
    const itemHeight = 38; // Height of each individual wheel-tick-node in pixels

    for (let i = 0; i < totalVirtualNodesCount; i += intervals) {
        const rawNumericValue = (i % totalSlots);
        const padStr = rawNumericValue.toString().padStart(2, '0');
        const tick = document.createElement('div');
        tick.classList.add('wheel-tick-node');
        tick.textContent = padStr;
        
        if (type === 'dh' && i === totalSlots) tick.classList.add('selected-time');
        if (type !== 'dh' && i === totalSlots) tick.classList.add('selected-time');
        
        track.appendChild(tick);
    }

    // 🎯 Snappy Scroll Handler for both directions
    let isWheeling = false;
    wheelContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (isWheeling) return;
        isWheeling = true;

        const direction = e.deltaY > 0 ? 1 : -1;
        wheelContainer.scrollBy({ top: direction * itemHeight, behavior: 'smooth' });

        setTimeout(() => {
            isWheeling = false;
        }, 45);
    }, { passive: false });

    // 🎯 Fixed Infinite Loop Correction & Reverse Boundary Checking
    wheelContainer.addEventListener('scroll', () => {
        const currentScrollPos = wheelContainer.scrollTop;
        const singleCylinderFullHeight = (totalSlots / intervals) * itemHeight;

        // Seamlessly loop forward if scrolled past the 3rd quadrant
        if (currentScrollPos > singleCylinderFullHeight * 2.5) {
            wheelContainer.scrollTop = currentScrollPos - singleCylinderFullHeight;
            return;
        }
        // Seamlessly loop backward (0 to 23) if scrolled up past the 1st quadrant
        if (currentScrollPos < singleCylinderFullHeight * 0.5) {
            wheelContainer.scrollTop = currentScrollPos + singleCylinderFullHeight;
            return;
        }

        clearTimeout(wheelContainer.scrollTimeout);
        wheelContainer.scrollTimeout = setTimeout(() => {
            const nodes = track.querySelectorAll('.wheel-tick-node');
            const containerCenter = wheelContainer.getBoundingClientRect().top + (wheelContainer.clientHeight / 2);
            let closestNode = null; let minDistance = Infinity;

            nodes.forEach(node => {
                const nodeCenter = node.getBoundingClientRect().top + (node.clientHeight / 2);
                const dist = Math.abs(containerCenter - nodeCenter);
                if (dist < minDistance) { minDistance = dist; closestNode = node; }
            });

            if (closestNode) {
                nodes.forEach(n => n.classList.remove('selected-time'));
                closestNode.classList.add('selected-time');
                wheelContainer.scrollTo({ top: closestNode.offsetTop - itemHeight, behavior: 'smooth' });

                if (type === 'sh') activeStartHour = closestNode.textContent;
                if (type === 'sm') activeStartMinute = closestNode.textContent;
                if (type === 'dh') activeDurationHour = closestNode.textContent;
                if (type === 'dm') activeDurationMinute = closestNode.textContent;
            }
        }, 25);
    });

    // Initialize position at the middle section for infinite looping buffer room in both directions
    setTimeout(() => {
        const initialTargetStartTick = track.querySelectorAll('.wheel-tick-node')[totalSlots / intervals];
        if (initialTargetStartTick) {
            wheelContainer.scrollTop = initialTargetStartTick.offsetTop - itemHeight;
        }
    }, 15);
}

// --- 🛠️ PERMANENT CUSTOM TASKS & PRESET RENDERING ---
function rebuildCategoryPresetButtons() {
    ['academics', 'skills', 'health', 'other'].forEach(categoryType => {
        const container = document.getElementById(`options-${categoryType}`);
        if (!container) return;

        // Clear dynamic preset buttons before rebuilding
        const existingCustomButtons = container.querySelectorAll('.dynamic-custom-preset-btn');
        existingCustomButtons.forEach(btn => btn.remove());

        const customTaskTriggerBtn = container.querySelector('.custom-task-btn');

        if (permanentCustomTasks[categoryType]) {
            permanentCustomTasks[categoryType].forEach(taskName => {
                const presetBtn = document.createElement('button');
                presetBtn.className = 'dynamic-custom-preset-btn';
                presetBtn.dataset.task = taskName;
                presetBtn.innerHTML = `
                    <span>${taskName}</span>
                    <span class="delete-preset-x" title="Delete Category Option" data-category="${categoryType}" data-task="${taskName}">&times;</span>
                `;
                
                presetBtn.addEventListener('click', (e) => {
                    if (e.target.classList.contains('delete-preset-x')) {
                        e.stopPropagation();
                        deletePermanentCategoryTask(categoryType, taskName);
                        return;
                    }
                    e.preventDefault(); e.stopPropagation();
                    document.querySelectorAll('.sub-buttons-row button').forEach(b => b.classList.remove('active-preset-highlight'));
                    presetBtn.classList.add('active-preset-highlight');
                    currentStagedTaskTitle = taskName;
                });

                container.insertBefore(presetBtn, customTaskTriggerBtn);
            });
        }
    });
}

function deletePermanentCategoryTask(category, taskName) {
    if (!confirm(`Are you sure you want to delete the permanent preset "${taskName}"?`)) return;
    permanentCustomTasks[category] = permanentCustomTasks[category].filter(t => t !== taskName);
    localStorage.setItem('productometer_permanent_custom_tasks', JSON.stringify(permanentCustomTasks));
    rebuildCategoryPresetButtons();
}

// --- 🎯 INTERCEPT PRESET TAPS ---
document.addEventListener('click', (e) => {
    const targetBtn = e.target.closest('.sub-buttons-row button');
    if (!targetBtn) return;
    
    const label = targetBtn.dataset.task || targetBtn.textContent.trim();
    
    if (targetBtn.classList.contains('custom-task-btn') || label.toLowerCase().includes('custom')) {
        if (customTaskModal && customTaskTitleInput) {
            customTaskTitleInput.value = ""; 
            if (savePermanentCheckbox) savePermanentCheckbox.checked = false; 
            customTaskModal.classList.remove('hidden');
            customTaskTitleInput.focus();
        }
    } else if (!targetBtn.classList.contains('dynamic-custom-preset-btn')) {
        // Standard built-in static preset button clicks
        document.querySelectorAll('.sub-buttons-row button').forEach(b => b.classList.remove('active-preset-highlight'));
        targetBtn.classList.add('active-preset-highlight');
        currentStagedTaskTitle = label;
    }
});

// --- 💾 CONFIRM CUSTOM TASK CREATION ---
if (taskConfirmBtn && customTaskTitleInput) {
    taskConfirmBtn.addEventListener('click', () => {
        const label = customTaskTitleInput.value.trim();
        if (!label) return;
        
        currentStagedTaskTitle = label;
        
        // Save permanently if checkbox is checked
        if (savePermanentCheckbox && savePermanentCheckbox.checked) {
            if (!permanentCustomTasks[currentSelectedCategoryType].includes(label)) {
                permanentCustomTasks[currentSelectedCategoryType].push(label);
                localStorage.setItem('productometer_permanent_custom_tasks', JSON.stringify(permanentCustomTasks));
                rebuildCategoryPresetButtons();
            }
        }

        if (customTaskModal) customTaskModal.classList.add('hidden');
        
        document.querySelectorAll('.sub-buttons-row button').forEach(b => b.classList.remove('active-preset-highlight'));
        const customBtn = document.querySelector(`#options-${currentSelectedCategoryType} .custom-task-btn`);
        if (customBtn) customBtn.classList.add('active-preset-highlight');
    });
}
// --- 🎯 INTERCEPT PRESET TAPS TO OPEN CUSTOM MODAL OVER TOP ---
    document.addEventListener('click', (e) => {
        const targetBtn = e.target.closest('.sub-buttons-row button');
        if (!targetBtn) return;
        
        const label = targetBtn.dataset.task || targetBtn.textContent.trim();
        
        if (targetBtn.classList.contains('custom-task-btn') || label.toLowerCase().includes('custom')) {
            const customTaskModal = document.getElementById('customTaskModal');
            const customTaskTitleInput = document.getElementById('customTaskTitleInput');
            const savePermanentCheckbox = document.getElementById('savePermanentCheckbox');
            
            if (customTaskModal && customTaskTitleInput) {
                customTaskTitleInput.value = ""; 
                if (savePermanentCheckbox) savePermanentCheckbox.checked = false; 
                
                // 🎯 Opens using showModal() so it automatically layers on top of the main task dialog
                if (typeof customTaskModal.showModal === 'function') {
                    customTaskModal.showModal();
                } else {
                    customTaskModal.classList.remove('hidden');
                }
                customTaskTitleInput.focus();
            }
        } else if (!targetBtn.classList.contains('dynamic-custom-preset-btn')) {
            document.querySelectorAll('.sub-buttons-row button').forEach(b => b.classList.remove('active-preset-highlight'));
            targetBtn.classList.add('active-preset-highlight');
            currentStagedTaskTitle = label;
        }
    });

    // --- 💾 CONFIRM CUSTOM TASK CREATION ---
    if (taskConfirmBtn && customTaskTitleInput) {
        taskConfirmBtn.addEventListener('click', () => {
            const label = customTaskTitleInput.value.trim();
            if (!label) return;
            
            currentStagedTaskTitle = label;
            
            if (savePermanentCheckbox && savePermanentCheckbox.checked) {
                if (!permanentCustomTasks[currentSelectedCategoryType].includes(label)) {
                    permanentCustomTasks[currentSelectedCategoryType].push(label);
                    localStorage.setItem('productometer_permanent_custom_tasks', JSON.stringify(permanentCustomTasks));
                    rebuildCategoryPresetButtons();
                }
            }

            // Close custom dialog properly
            if (customTaskModal) {
                if (typeof customTaskModal.close === 'function') customTaskModal.close();
                else customTaskModal.classList.add('hidden');
            }
            
            document.querySelectorAll('.sub-buttons-row button').forEach(b => b.classList.remove('active-preset-highlight'));
            const customBtn = document.querySelector(`#options-${currentSelectedCategoryType} .custom-task-btn`);
            if (customBtn) customBtn.classList.add('active-preset-highlight');
        });
    }

    if (taskCancelBtn) { 
        taskCancelBtn.addEventListener('click', () => { 
            if (customTaskModal) {
                if (typeof customTaskModal.close === 'function') customTaskModal.close();
                else customTaskModal.classList.add('hidden');
            }
        }); 
    }
if (taskCancelBtn) { 
    taskCancelBtn.addEventListener('click', () => { 
        if (customTaskModal) customTaskModal.classList.add('hidden'); 
    }); 
}

// --- 🚨 MASTER ADD/EDIT LINK SAVE TRANSACTION WITH COLLISION BUFFER CHECK ---
if (addToPlannerBtn) {
    const newAddToPlannerBtn = addToPlannerBtn.cloneNode(true);
    addToPlannerBtn.parentNode.replaceChild(newAddToPlannerBtn, addToPlannerBtn);

    newAddToPlannerBtn.addEventListener('click', () => {
        let finalTitle = currentStagedTaskTitle.trim();
        if (!finalTitle) {
            finalTitle = currentSelectedCategoryType === 'other' ? "ROUTINE TASK" : `${currentSelectedCategoryType.toUpperCase()} ACTIVITY`;
        }

        const startMin = (parseInt(activeStartHour) * 60) + parseInt(activeStartMinute);
        const durationMin = (parseInt(activeDurationHour) * 60) + parseInt(activeDurationMinute);

        if (durationMin === 0) { alert("Error: Duration length cannot be zero minutes!"); return; }
        if (startMin + durationMin > 1440) { alert("Error: Scheduled blocks overflow past midnight daily bounds!"); return; }

        const newEndMin = startMin + durationMin;

        // 🛡️ BIDIRECTIONAL 5-MINUTE BUFFER COLLISION CHECK
        const conflictingTask = plannerListData.find(task => {
            if (selectedTaskIdForEdit && task.id === selectedTaskIdForEdit) return false;

            const existingStart = task.startMin;
            const existingEnd = task.startMin + task.durationMin;

            return (existingStart < newEndMin + 5) && (existingEnd > startMin - 5);
        });

        const errorNoticeBox = document.getElementById('taskErrorNotice');
        const errorMessageText = document.getElementById('taskErrorMessage');

        if (conflictingTask) {
            const conflictStart = conflictingTask.startMin;
            const conflictEnd = conflictingTask.startMin + conflictingTask.durationMin;

            if (startMin >= conflictStart) {
                // Case A: Starting inside or overlapping an existing task
                const minAllowedStart = conflictEnd + 5;
                const minAllowedHours = Math.floor(minAllowedStart / 60).toString().padStart(2, '0');
                const minAllowedMins = (minAllowedStart % 60).toString().padStart(2, '0');

                if (errorNoticeBox && errorMessageText) {
                    errorMessageText.textContent = `Tasks need a 5-minute gap! Conflicts with "${conflictingTask.title}". Earliest start time is ${minAllowedHours}:${minAllowedMins}.`;
                    errorNoticeBox.style.display = 'flex';
                    errorNoticeBox.classList.remove('hidden');
                }
            } else {
                // Case B: Our ending time collides with or overflows into the next scheduled task
                const maxAllowedDurationMins = (conflictStart - 5) - startMin;
                const maxHours = Math.floor(maxAllowedDurationMins / 60);
                const maxMins = maxAllowedDurationMins % 60;

                if (errorNoticeBox && errorMessageText) {
                    errorMessageText.textContent = `Collision with upcoming task "${conflictingTask.title}"! Maximum possible duration before this task is ${maxHours}h ${maxMins}m.`;
                    errorNoticeBox.style.display = 'flex';
                    errorNoticeBox.classList.remove('hidden');
                }
            }
            return;
        } else {
            // Hide error notice if validation passes successfully
            if (errorNoticeBox) errorNoticeBox.style.display = 'none';
        }

        let assignedThemeColor = baseColors[currentSelectedCategoryType] || '#78909c';
        if (currentSelectedCategoryType === 'other') {
            const count = plannerListData.filter(t => t.category === 'other' && t.id !== selectedTaskIdForEdit).length;
            assignedThemeColor = extendedPalette[count % extendedPalette.length];
        }

        const optionalDesc = taskDescriptionInput ? taskDescriptionInput.value.trim() : "";
        const formattedTime = `${activeStartHour}:${activeStartMinute}`;

        if (selectedTaskIdForEdit) {
            // 🔄 EDIT MODE: Update existing task object
            const taskIndex = plannerListData.findIndex(t => t.id === selectedTaskIdForEdit);
            if (taskIndex !== -1) {
                plannerListData[taskIndex] = {
                    ...plannerListData[taskIndex],
                    title: finalTitle.toUpperCase(),
                    category: currentSelectedCategoryType,
                    color: assignedThemeColor,
                    startMin: startMin,
                    durationMin: durationMin,
                    timeDisplayStr: formattedTime,
                    time: formattedTime,
                    durationMinutes: durationMin,
                    description: optionalDesc || `Objective updated for your daily ${currentSelectedCategoryType} routine timeline.`
                };
            }
            selectedTaskIdForEdit = null;
        } else {
            // ➕ CREATE MODE: Push new task object
            const newPlannerItem = {
                id: 'chrono_' + Date.now(),
                title: finalTitle.toUpperCase(),
                category: currentSelectedCategoryType,
                color: assignedThemeColor,
                startMin: startMin,
                durationMin: durationMin,
                timeDisplayStr: formattedTime,
                time: formattedTime,
                durationMinutes: durationMin,
                description: optionalDesc || `Objective mapped for your daily ${currentSelectedCategoryType} routine timeline.`
            };
            plannerListData.push(newPlannerItem);
        }

        plannerListData.sort((a, b) => a.startMin - b.startMin); 
        localStorage.setItem('productometer_chrono_planner_list', JSON.stringify(plannerListData));
        
        synchronizeLegacyTimelineArray();
        renderChronologicalMasterTimelineGrid();

        currentStagedTaskTitle = "";
        if (taskDescriptionInput) taskDescriptionInput.value = "";
        document.querySelectorAll('.sub-buttons-row button').forEach(b => b.classList.remove('active-preset-highlight'));
        
        const editBtn = document.getElementById('openEditTaskDialogBtn');
        if (editBtn) {
            editBtn.style.opacity = '0.5';
            editBtn.style.pointerEvents = 'none';
            editBtn.setAttribute('disabled', 'true');
        }

        if (taskBuilderDialog) taskBuilderDialog.close();
    });
}
// --- 📊 RENDER TIMELINE & SYNC ---
function renderChronologicalMasterTimelineGrid() {
    if (!plannerTaskBucket || !masterNeonFillTrack) return;
    plannerTaskBucket.innerHTML = ""; masterNeonFillTrack.innerHTML = "";

    if (plannerListData.length === 0) {
        plannerTaskBucket.innerHTML = `<p class="todo-empty-placeholder">Your Day Planner track is empty. Spin the 3D scroll drums below to block out your routine!</p>`;
        return;
    }

    plannerListData.forEach(task => {
        const card = document.createElement('div'); 
        card.classList.add('chrono-task-card');
        card.setAttribute('data-task-id', task.id); // Tag card with unique ID for edit tracking
        card.style.borderColor = task.color + '55';
        card.style.boxShadow = `0 0 25px ${task.color}15, inset 0 0 15px ${task.color}10`;

        card.innerHTML = `
            <div class="card-time-badge" style="color: ${task.color}; border-color: ${task.color}33;">${task.timeDisplayStr}</div>
            <div class="card-info-stack">
                <div class="card-main-title">${task.title}</div>
                <div class="card-sub-description">${task.description} (${(task.durationMin/60).toFixed(1)}h)</div>
            </div>
            <button class="delete-chrono-item-btn" title="Delete Task">&times;</button>
        `;

        // 🎯 SELECT ON DOUBLE CLICK (Desktop)
        card.addEventListener('dblclick', () => {
            selectTaskForEditing(task);
            // Instantly open edit modal on double click
            const editBtn = document.getElementById('openEditTaskDialogBtn');
            if (editBtn) editBtn.click();
        });

        // 🎯 SELECT ON LONG PRESS (Mobile / Touch screens - 600ms hold)
        let pressTimer = null;
        card.addEventListener('touchstart', () => {
            pressTimer = setTimeout(() => {
                selectTaskForEditing(task);
                const editBtn = document.getElementById('openEditTaskDialogBtn');
                if (editBtn) editBtn.click();
            }, 600);
        });
        card.addEventListener('touchend', () => { clearTimeout(pressTimer); });
        card.addEventListener('touchmove', () => { clearTimeout(pressTimer); });

        // Single click also selects for editing so the Edit button becomes active
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-chrono-item-btn')) return;
            selectTaskForEditing(task);
        });

        card.querySelector('.delete-chrono-item-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            plannerListData = plannerListData.filter(t => t.id !== task.id);
            localStorage.setItem('productometer_chrono_planner_list', JSON.stringify(plannerListData));
            synchronizeLegacyTimelineArray();
            renderChronologicalMasterTimelineGrid();
        });
        
        plannerTaskBucket.appendChild(card);

        const left = (task.startMin / 1440) * 100; const width = (task.durationMin / 1440) * 100;
        const segment = document.createElement('div'); segment.classList.add('chrono-color-segment');
        segment.style.left = `${left}%`; segment.style.width = `${width}%`; segment.style.backgroundColor = task.color;
        segment.style.boxShadow = `0 0 15px ${task.color}, inset 0 0 6px rgba(0,0,0,0.3)`;
        masterNeonFillTrack.appendChild(segment);
    });
}

function synchronizeLegacyTimelineArray() {
    const legacyTimelineArray = Array(48).fill(null);
    plannerListData.forEach(task => {
        const startSlotIndex = Math.floor(task.startMin / 30);
        const slotCountSpan = Math.round(task.durationMin / 30);
        for (let s = 0; s < slotCountSpan; s++) {
            if (startSlotIndex + s < 48) legacyTimelineArray[startSlotIndex + s] = task.category;
        }
    });
    localStorage.setItem('productometer_timeline', JSON.stringify(legacyTimelineArray));
}
// --- ✏️ TASK EDITING & SELECTION STATE MANAGEMENT ---
let selectedTaskIdForEdit = null;

// Helper function to convert minutes past midnight (e.g., 540) back to "HH:MM"
function convertMinutesToHourMinute(totalMins) {
    const hrs = Math.floor(totalMins / 60).toString().padStart(2, '0');
    const mins = (totalMins % 60).toString().padStart(2, '0');
    return { hours: hrs, minutes: mins };
}

// Function to set a specific drum wheel to a target numeric value string
function setDrumWheelValue(wheelContainer, targetValueStr) {
    if (!wheelContainer) return;
    const track = wheelContainer.querySelector('.wheel-scroll-track-drum');
    if (!track) return;
    
    const nodes = track.querySelectorAll('.wheel-tick-node');
    let targetNode = null;

    nodes.forEach(node => {
        if (node.textContent === targetValueStr) {
            targetNode = node;
        }
    });

    if (targetNode) {
        nodes.forEach(n => n.classList.remove('selected-time'));
        targetNode.classList.add('selected-time');
        wheelContainer.scrollTop = targetNode.offsetTop - 38;
    }
}

// Function to select a task card visually and enable the Edit button
function selectTaskForEditing(task) {
    selectedTaskIdForEdit = task.id;
    
    // Highlight selected card visually
    document.querySelectorAll('.chrono-task-card').forEach(c => c.classList.remove('selected-for-edit'));
    const targetCard = document.querySelector(`[data-task-id="${task.id}"]`);
    if (targetCard) targetCard.classList.add('selected-for-edit');

    // Enable Edit Action Button
    const editBtn = document.getElementById('openEditTaskDialogBtn');
    if (editBtn) {
        editBtn.style.opacity = '1';
        editBtn.style.pointerEvents = 'auto';
        editBtn.removeAttribute('disabled');
    }
}

// Global click to deselect if clicking outside cards
document.addEventListener('click', (e) => {
    if (!e.target.closest('.chrono-task-card') && !e.target.closest('#openEditTaskDialogBtn')) {
        selectedTaskIdForEdit = null;
        document.querySelectorAll('.chrono-task-card').forEach(c => c.classList.remove('selected-for-edit'));
        const editBtn = document.getElementById('openEditTaskDialogBtn');
        if (editBtn) {
            editBtn.style.opacity = '0.5';
            editBtn.style.pointerEvents = 'none';
            editBtn.setAttribute('disabled', 'true');
        }
    }
});

// --- ✏️ OPEN EDIT DIALOG PRE-FILLED WITH COMPLETE TASK DATA ---
const openEditTaskDialogBtn = document.getElementById('openEditTaskDialogBtn');
if (openEditTaskDialogBtn) {
    openEditTaskDialogBtn.addEventListener('click', () => {
        if (!selectedTaskIdForEdit) return;
        const taskToEdit = plannerListData.find(t => t.id === selectedTaskIdForEdit);
        if (!taskToEdit) return;

        // 1. Open the main task dialog
        if (taskBuilderDialog) taskBuilderDialog.showModal();

        // 2. Pre-fill Category tab & switch sub-button rows correctly
        currentSelectedCategoryType = taskToEdit.category;
        document.querySelectorAll('.type-tab-btn').forEach(b => {
            if (b.dataset.type === taskToEdit.category) {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });

        document.querySelectorAll('.sub-buttons-row').forEach(row => {
            row.style.display = 'none';
        });
        const activeRow = document.getElementById(`options-${taskToEdit.category}`);
        if (activeRow) {
            activeRow.style.display = 'flex';
        }

        // 3. Pre-fill Title & Description
        currentStagedTaskTitle = taskToEdit.title;
        if (taskDescriptionInput) taskDescriptionInput.value = taskToEdit.description || "";

        // Highlight matching preset button if it exists
        document.querySelectorAll('.sub-buttons-row button').forEach(b => b.classList.remove('active-preset-highlight'));
        const matchingBtn = document.querySelector(`.sub-buttons-row button[data-task="${taskToEdit.title}"]`);
        if (matchingBtn) {
            matchingBtn.classList.add('active-preset-highlight');
        } else {
            // Otherwise highlight the custom button if it's a custom task
            const customBtn = document.querySelector(`#options-${taskToEdit.category} .custom-task-btn`);
            if (customBtn) customBtn.classList.add('active-preset-highlight');
        }

        // 4. Pre-fill Start Time & Duration values
        const startTimeObj = convertMinutesToHourMinute(taskToEdit.startMin);
        const durationTimeObj = convertMinutesToHourMinute(taskToEdit.durationMin);

        activeStartHour = startTimeObj.hours;
        activeStartMinute = startTimeObj.minutes;
        activeDurationHour = durationTimeObj.hours;
        activeDurationMinute = durationTimeObj.minutes;

        // 5. Rebuild drums and forcefully snap them to exact target values after render queue clears
        setTimeout(() => {
            initializeTouchDrumsMatrix();
            
            // Allow container DOM paint cycle to complete before snapping scroll positions
            setTimeout(() => {
                setDrumWheelValue(wheelStartHours, activeStartHour);
                setDrumWheelValue(wheelStartMinutes, activeStartMinute);
                setDrumWheelValue(wheelDurationHours, activeDurationHour);
                setDrumWheelValue(wheelDurationMinutes, activeDurationMinute);
            }, 30);
        }, 50);
    });
}