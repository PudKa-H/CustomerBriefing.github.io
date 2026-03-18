// ============================================================
// CONFIGURATION
// ============================================================
// ใส่ Web App URL ที่ได้จากการ Deploy Google Apps Script ตรงนี้
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxmA8eGs_ANkW5Wm8hJ50feQuVT44Ck90SQ6w08UIyNWG_WYe61sajSZ0gYBFprAZO8/exec";
const LIFF_ID = "2009416786-VFmrGJIF";

let lineUserId = null;
let lineUserName = null;
let lineUserPicture = null;

// ============================================================
// VOICE INPUT ENGINE
// ============================================================
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let currentTarget = null;
let isListening = false;
let activeBtn = null;
let uploadedFiles = [];
let currentStep = 1;
const totalSteps = 6;

// ============================================================
// MULTI-STEP NAVIGATION
// ============================================================
window.nextStep = function (step) {
    if (!validateStep(step)) return;

    if (currentStep < totalSteps) {
        document.getElementById('step-' + currentStep).classList.remove('active');
        currentStep++;
        document.getElementById('step-' + currentStep).classList.add('active');
        updateStepper();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

window.prevStep = function (step) {
    if (currentStep > 1) {
        document.getElementById('step-' + currentStep).classList.remove('active');
        currentStep--;
        document.getElementById('step-' + currentStep).classList.add('active');
        updateStepper();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

function updateStepper() {
    document.querySelectorAll('.step-indicator').forEach((el, idx) => {
        const stepNum = idx + 1;
        el.classList.remove('active', 'completed');
        if (stepNum === currentStep) el.classList.add('active');
        else if (stepNum < currentStep) el.classList.add('completed');
    });

    document.querySelectorAll('.step-line').forEach((el, idx) => {
        const stepNum = idx + 1;
        el.classList.remove('active');
        if (stepNum < currentStep) el.classList.add('active');
    });
}

function validateStep(step) {
    if (step === 1) {
        return true;
    }

    // Add more validation if needed
    return true;
}

function showToast(msg, type = '') {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast show ' + type;
    setTimeout(() => { t.className = 'toast'; }, 3200);
}

function setListening(targetId, btn, on) {
    const el = document.getElementById(targetId);
    const statusEl = document.getElementById('status-' + targetId);
    if (on) {
        if (el) el.classList.add('listening');
        if (statusEl) statusEl.classList.add('visible');
        if (btn) btn.classList.add('active');
    } else {
        if (el) el.classList.remove('listening');
        if (statusEl) statusEl.classList.remove('visible');
        if (btn) btn.classList.remove('active');
    }
}

function startRecognition(targetId, btn) {
    if (!SpeechRecognition) {
        showToast('❌ เบราว์เซอร์นี้ไม่รองรับการรับเสียง กรุณาใช้ Chrome', 'error');
        return;
    }

    if (isListening && currentTarget === targetId) {
        stopRecognition();
        return;
    }

    if (recognition) {
        recognition.abort();
        if (currentTarget) setListening(currentTarget, activeBtn, false);
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'th-TH';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    currentTarget = targetId;
    activeBtn = btn;
    isListening = true;
    setListening(targetId, btn, true);

    let finalTranscript = '';
    let interimTranscript = '';

    recognition.onresult = (event) => {
        finalTranscript = '';
        interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const t = event.results[i][0].transcript;
            if (event.results[i].isFinal) finalTranscript += t;
            else interimTranscript += t;
        }
        const el = document.getElementById(targetId);
        if (el) {
            const existing = el.dataset.confirmed || '';
            el.value = existing + (finalTranscript || interimTranscript);
        }
    };

    recognition.onend = () => {
        isListening = false;
        setListening(targetId, btn, false);
        const el = document.getElementById(targetId);
        if (el && finalTranscript) {
            el.dataset.confirmed = el.value;
            // Dispatch input event so localStorage auto-save can catch it
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }
        currentTarget = null;
        activeBtn = null;
    };

    recognition.onerror = (e) => {
        isListening = false;
        setListening(targetId, activeBtn, false);
        currentTarget = null;
        activeBtn = null;
        if (e.error === 'not-allowed') {
            showToast('❌ กรุณาอนุญาตให้ใช้ไมโครโฟน', 'error');
        } else if (e.error !== 'aborted') {
            showToast('⚠️ ไม่ได้ยินเสียง ลองอีกครั้ง', 'error');
        }
    };

    recognition.start();
    showToast('🎤 กำลังฟัง... พูดได้เลย');
}

function stopRecognition() {
    if (recognition) recognition.stop();
}

// ============================================================
// INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize LIFF
    try {
        await liff.init({ liffId: LIFF_ID });
        if (!liff.isLoggedIn()) {
            liff.login();
            return;
        }
        const profile = await liff.getProfile();
        lineUserId = profile.userId;
        lineUserName = profile.displayName;
        lineUserPicture = profile.pictureUrl;

        // Update UI with profile
        const userProfile = document.getElementById('userProfile');
        const userImg = document.getElementById('userImg');
        const userName = document.getElementById('userName');
        if (userProfile && userImg && userName) {
            userImg.src = lineUserPicture;
            userName.textContent = lineUserName;
            userProfile.style.display = 'flex';
        }

        // Load existing data from Google Sheets via Apps Script
        await loadUserData();

        // Hide overlay
        const overlay = document.getElementById('liffLoading');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.style.display = 'none', 500);
        }

    } catch (err) {
        console.error('LIFF Error:', err);
        showToast('❌ ไม่สามารถเชื่อมต่อกับ LINE ได้', 'error');
        // Hide overlay even on error
        const overlay = document.getElementById('liffLoading');
        if (overlay) overlay.style.display = 'none';
    }

    // Attach mic buttons
    document.querySelectorAll('.mic-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            startRecognition(target, btn);
        });
    });

    // Platform Detail Toggle
    document.querySelectorAll('.platform-item input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const detail = checkbox.closest('.platform-item').querySelector('.platform-detail');
            if (detail) {
                if (checkbox.checked) detail.classList.add('active');
                else detail.classList.remove('active');
            }
        });
    });

    // Member Choice Toggle
    const memberChoices = document.querySelectorAll('input[name="memberChoice"]');
    const memberDetailContainer = document.getElementById('memberDetailContainer');
    const memberNoneContainer = document.getElementById('memberNoneContainer');
    memberChoices.forEach(choice => {
        choice.addEventListener('change', () => {
            if (memberDetailContainer && memberNoneContainer) {
                if (choice.value === 'has') {
                    memberDetailContainer.style.display = 'block';
                    memberNoneContainer.style.display = 'none';
                } else {
                    memberDetailContainer.style.display = 'none';
                    memberNoneContainer.style.display = 'block';
                }
            }
        });
    });

    // Global mic logic
    let lastFocusedField = null;
    document.querySelectorAll('input[type="text"], input[type="tel"], input[type="email"], textarea').forEach(el => {
        el.addEventListener('focus', () => { lastFocusedField = el.id; });
    });

    const globalMic = document.getElementById('globalMic');
    const globalMicLabel = document.getElementById('globalMicLabel');

    if (globalMic) {
        globalMic.addEventListener('click', () => {
            if (isListening) {
                stopRecognition();
                globalMic.classList.remove('active');
                if (globalMicLabel) globalMicLabel.classList.remove('show');
                return;
            }
            const target = lastFocusedField || 'project';
            const fieldEl = document.getElementById(target);
            if (fieldEl) fieldEl.focus();
            globalMic.classList.add('active');
            if (globalMicLabel) globalMicLabel.classList.add('show');
            startRecognition(target, null);

            const originalOnEnd = () => {
                globalMic.classList.remove('active');
                if (globalMicLabel) globalMicLabel.classList.remove('show');
            };
            if (recognition) {
                const prev = recognition.onend;
                recognition.onend = (e) => { prev && prev(e); originalOnEnd(); };
            }
        });
    }

    // File Upload
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');

    if (dropZone && fileInput) {
        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', e => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
        dropZone.addEventListener('drop', e => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            handleFiles(e.dataTransfer.files);
        });
        fileInput.addEventListener('change', () => handleFiles(fileInput.files));
    }

    function handleFiles(files) {
        Array.from(files).forEach(f => {
            if (f.size > 50 * 1024 * 1024) {
                showToast(`⚠️ ${f.name} ใหญ่เกิน 50MB`, 'error'); return;
            }
            uploadedFiles.push(f);
            renderFileItem(f);
        });
    }

    function renderFileItem(file) {
        if (!fileList) return;
        const size = (file.size / 1024 / 1024).toFixed(2);
        const item = document.createElement('div');
        item.className = 'file-item';
        item.dataset.name = file.name;
        item.innerHTML = `<span>📄 ${file.name} <small style="color:#777">(${size} MB)</small></span>
        <button type="button" class="file-remove" title="ลบ">✕</button>`;
        item.querySelector('.file-remove').addEventListener('click', () => {
            uploadedFiles = uploadedFiles.filter(f => f.name !== file.name);
            item.remove();
        });
        fileList.appendChild(item);
    }

    // Contact Info Auto-save (LocalStorage)
    const contactFields = ['contactName', 'contactPhone', 'contactEmail', 'contactLine'];
    contactFields.forEach(field => {
        const el = document.getElementById(field);
        const saved = localStorage.getItem(field);
        if (el) {
            if (saved) el.value = saved;
            el.addEventListener('input', () => localStorage.setItem(field, el.value));
        }
    });

    // Form Submit
    const briefingForm = document.getElementById('briefingForm');
    if (briefingForm) {
        briefingForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const brand = document.getElementById('brand').value.trim();
            const contactName = document.getElementById('contactName').value.trim();



            if (SCRIPT_URL.includes("YOUR_APPS_SCRIPT")) {
                showToast('⚠️ ยังไม่ได้ตั้งค่า URL ของ Apps Script', 'error');
                return;
            }

            showToast('⏳ กำลังอัปโหลดไฟล์และบันทึกข้อมูล... (อาจใช้เวลาสักครู่)', '');

            try {
                const formData = await getFormDataAsync();

                // Debugging: แสดงข้อมูลที่กำลังจะส่งใน Console
                console.log("📤 กำลังส่งข้อมูลไปยัง Google Sheets:", formData);

                // 🔴 เปลี่ยนวิธีส่งข้อมูลจาก application/json เป็น text/plain 
                // เพื่อให้ทะลุข้อห้ามการส่งข้ามโดเมนของระบบ Google
                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    cache: 'no-cache',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(formData)
                });

                showToast('✅ บันทึกข้อมูลและแนบไฟล์เรียบร้อยแล้ว!', 'success');
                briefingForm.reset();
                uploadedFiles = [];
                if (fileList) fileList.innerHTML = '';

                // Clear LocalStorage after success
                localStorage.removeItem('contactName');
                localStorage.removeItem('contactPhone');
                localStorage.removeItem('contactEmail');
                localStorage.removeItem('contactLine');

                // Reset Multi-step
                document.getElementById('step-' + currentStep).classList.remove('active');
                currentStep = 1;
                document.getElementById('step-1').classList.add('active');
                updateStepper();

            } catch (error) {
                console.error('Error!', error.message);
                showToast('❌ ไม่สามารถบันทึกข้อมูลได้', 'error');
            }
        });
    }

    async function getFormDataAsync() {
        // Collect platforms with their details
        const platformItems = document.querySelectorAll('.platform-item');
        const platforms = [];
        platformItems.forEach(item => {
            const checkbox = item.querySelector('input[name="platform"]');
            if (checkbox && checkbox.checked) {
                const detail = item.querySelector('.platform-detail')?.value || '';
                platforms.push(`${checkbox.value}: ${detail}`);
            }
        });

        const filesData = await Promise.all(uploadedFiles.map(file => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    resolve({
                        name: file.name,
                        mimeType: file.type || 'application/octet-stream',
                        base64: reader.result.split(',')[1]
                    });
                };
                reader.onerror = error => reject(error);
                reader.readAsDataURL(file);
            });
        }));

        return {
            userId: lineUserId,
            userName: lineUserName,
            userPicture: lineUserPicture,
            project: document.getElementById('project').value,
            brand: document.getElementById('brand').value,
            background: document.getElementById('background').value,
            requirement: document.getElementById('requirement').value,
            objective: document.getElementById('objective').value,
            target: document.getElementById('target').value,
            details: document.getElementById('details').value,
            activity: document.getElementById('activity').value,
            platforms,
            platformOther: document.getElementById('platformOther').value,
            member: document.querySelector('input[name="memberChoice"]:checked').value === 'has'
                ? `มี: ${document.getElementById('memberDetail').value}`
                : `ไม่มี (สร้างระบบให้: ${document.querySelector('input[name="memberCreate"]:checked').value === 'yes' ? 'ต้องการ' : 'ไม่ต้องการ'})`,
            promotion: document.getElementById('promotion').value,
            timing: `${document.getElementById('timingStart').value} ถึง ${document.getElementById('timingEnd').value}`,
            contactName: document.getElementById('contactName').value,
            contactPhone: document.getElementById('contactPhone').value,
            contactEmail: document.getElementById('contactEmail').value,
            contactLine: document.getElementById('contactLine').value,
            files: filesData,
        };
    }

    // Voice Banner Support Check
    if (!SpeechRecognition) {
        const banner = document.querySelector('.voice-banner');
        if (banner) {
            banner.style.background = 'rgba(231,76,60,0.1)';
            banner.style.borderColor = 'rgba(231,76,60,0.3)';
            const lastSpan = banner.querySelector('span:last-child');
            if (lastSpan) {
                lastSpan.textContent = '⚠️ เบราว์เซอร์นี้ไม่รองรับการรับเสียง — กรุณาใช้ Google Chrome';
            }
        }
    }
});

async function loadUserData() {
    if (!lineUserId) return;
    showToast('⌛ กำลังโหลดข้อมูลเดิมของคุณ...');

    try {
        const response = await fetch(`${SCRIPT_URL}?userId=${lineUserId}`);
        const result = await response.json();

        if (result.status === 'success' && result.data) {
            const data = result.data;
            // Pre-populate fields
            if (data.project) document.getElementById('project').value = data.project;
            if (data.brand) document.getElementById('brand').value = data.brand;
            if (data.background) document.getElementById('background').value = data.background;
            if (data.requirement) document.getElementById('requirement').value = data.requirement;
            if (data.objective) document.getElementById('objective').value = data.objective;
            if (data.target) document.getElementById('target').value = data.target;
            if (data.details) document.getElementById('details').value = data.details;
            if (data.activity) document.getElementById('activity').value = data.activity;
            if (data.platformOther) document.getElementById('platformOther').value = data.platformOther;

            // Member handling
            if (data.member) {
                if (data.member.startsWith('มี:')) {
                    document.querySelector('input[name="memberChoice"][value="has"]').checked = true;
                    document.getElementById('memberDetailContainer').style.display = 'block';
                    document.getElementById('memberNoneContainer').style.display = 'none';
                    document.getElementById('memberDetail').value = data.member.replace('มี: ', '');
                } else if (data.member.startsWith('ไม่มี')) {
                    document.querySelector('input[name="memberChoice"][value="none"]').checked = true;
                    document.getElementById('memberDetailContainer').style.display = 'none';
                    document.getElementById('memberNoneContainer').style.display = 'block';
                    const createMatch = data.member.match(/สร้างระบบให้: (ต้องการ|ไม่ต้องการ)/);
                    if (createMatch) {
                        const createVal = createMatch[1] === 'ต้องการ' ? 'yes' : 'no';
                        document.querySelector(`input[name="memberCreate"][value="${createVal}"]`).checked = true;
                    }
                }
            }

            if (data.promotion) document.getElementById('promotion').value = data.promotion;
            // Timing
            if (data.timing) {
                const parts = data.timing.split(' ถึง ');
                if (parts.length === 2) {
                    document.getElementById('timingStart').value = parts[0];
                    document.getElementById('timingEnd').value = parts[1];
                }
            }
            if (data.contactName) {
                document.getElementById('contactName').value = data.contactName;
                localStorage.setItem('contactName', data.contactName);
            }
            if (data.contactPhone) {
                document.getElementById('contactPhone').value = data.contactPhone;
                localStorage.setItem('contactPhone', data.contactPhone);
            }
            if (data.contactEmail) {
                document.getElementById('contactEmail').value = data.contactEmail;
                localStorage.setItem('contactEmail', data.contactEmail);
            }
            if (data.contactLine) {
                document.getElementById('contactLine').value = data.contactLine;
                localStorage.setItem('contactLine', data.contactLine);
            }

            showToast('✅ โหลดข้อมูลเดิมเรียบร้อยแล้ว');
        }
    } catch (error) {
        console.error('Fetch error:', error);
        // Silently fail if no data or error
    }
}
