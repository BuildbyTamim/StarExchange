// ============================================
// MAIN LOGIC FILE (User Dashboard)
// Updated for: Custom Timer & TON Value
// ============================================

// গ্লোবাল ভেরিয়েবল
let currentUser = null;
let currentWithdrawBatchId = null; 
const DEFAULT_RATE = 0.003; // যদি এডমিন TON ভ্যালু না দেয়, তবে এই রেট কাজ করবে

// ============================================
// ১. লগইন এবং সেশন ম্যানেজমেন্ট
// ============================================

document.addEventListener("DOMContentLoaded", () => {
    // আগের সেশন চেক করা
    const savedUser = localStorage.getItem("telegramUser");
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showDashboard(currentUser);
    }
});

// HTML ফাইল থেকে এই ফাংশন কল হবে (Telegram Login Widget)
function handleTelegramLogin(user) {
    console.log("User Logged In:", user);
    
    // লোকাল স্টোরেজে সেভ রাখা
    localStorage.setItem("telegramUser", JSON.stringify(user));
    currentUser = user;

    // ফায়ারবেসে ইউজার প্রোফাইল আপডেট বা তৈরি করা
    db.collection("users").doc(user.id.toString()).set({
        id: user.id,
        first_name: user.first_name,
        username: user.username || "No Username",
        photo_url: user.photo_url || "",
        last_login: new Date()
    }, { merge: true })
    .then(() => {
        showDashboard(user);
    })
    .catch((error) => {
        console.error("Error saving user:", error);
        alert("Login Error! Check console.");
    });
}

// ড্যাশবোর্ড দেখানো
function showDashboard(user) {
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('dashboard-view').classList.remove('hidden');

    // প্রোফাইল ডাটা সেট
    document.getElementById('display-name').innerText = user.first_name;
    document.getElementById('username').innerText = user.username ? "@" + user.username : "No Username";
    if(user.photo_url) {
        document.getElementById('user-photo').src = user.photo_url;
    }

    // মেইন ডাটা লোড করা শুরু
    loadUserStars(user.id);
}

// লগআউট (গ্লোবাল)
window.logout = function() {
    localStorage.removeItem("telegramUser");
    location.reload();
}


// ============================================
// ২. ডাটা লোড এবং ক্যালকুলেশন
// ============================================

function loadUserStars(userId) {
    const historyList = document.getElementById('history-list');
    const totalCountEl = document.getElementById('total-stars-count');
    const tonValueEl = document.getElementById('ton-value');
    const badgeEl = document.getElementById('multi-account-badge');

    historyList.innerHTML = '<div class="empty-state"><p>Loading data...</p></div>';

    // ফায়ারবেস থেকে ডাটা আনা
    db.collection("star_batches")
        .where("user_id", "==", userId.toString())
        .orderBy("created_at", "desc")
        .onSnapshot((snapshot) => {
            let totalStars = 0;
            let totalTonValue = 0;
            let totalAccounts = 0; // একাউন্ট সংখ্যা যোগ হবে
            let html = "";

            if (snapshot.empty) {
                historyList.innerHTML = '<div class="empty-state"><p>No stars received yet.</p></div>';
                totalCountEl.innerText = "0";
                tonValueEl.innerText = "0.00 TON";
                badgeEl.classList.add('hidden');
                return;
            }

            snapshot.forEach((doc) => {
                const data = doc.data();
                const batchId = doc.id;
                
                // রিজেক্টেড না হলে যোগ হবে
                if (data.status !== 'rejected') {
                    totalStars += parseInt(data.amount);
                    
                    // TON ভ্যালু হিসাব (এডমিন ভ্যালু অথবা ডিফল্ট রেট)
                    const batchTon = data.ton_value ? parseFloat(data.ton_value) : (data.amount * DEFAULT_RATE);
                    totalTonValue += batchTon;

                    // একাউন্ট সংখ্যা হিসাব (এডমিন ইনপুট অথবা ডিফল্ট ১)
                    const accCount = data.account_count ? parseInt(data.account_count) : 1;
                    totalAccounts += accCount;
                }

                html += createHistoryCard(batchId, data);
            });

            // UI আপডেট
            historyList.innerHTML = html;
            totalCountEl.innerText = totalStars.toLocaleString();
            tonValueEl.innerText = totalTonValue.toFixed(2) + " TON";

            // মাল্টিপল একাউন্ট ব্যাজ (যদি ১ এর বেশি হয়)
            if (totalAccounts > 1) {
                badgeEl.innerText = `From ${totalAccounts} Accounts`;
                badgeEl.classList.remove('hidden');
            } else {
                badgeEl.classList.add('hidden');
            }
        });
}


// ============================================
// ৩. হিস্ট্রি কার্ড এবং কাস্টম টাইমার লজিক
// ============================================

function createHistoryCard(docId, data) {
    // আনলক ডেট বের করা (সরাসরি ডাটাবেস থেকে)
    // যদি পুরনো ডাটা হয় যেখানে unlock_date নেই, তবে created_at + 21 দিন ধরা হবে (Safety)
    let unlockDate;
    if (data.unlock_date) {
        unlockDate = data.unlock_date.toDate();
    } else {
        const created = data.created_at.toDate();
        unlockDate = new Date(created);
        unlockDate.setDate(created.getDate() + 21);
    }

    const today = new Date();
    const isLocked = today < unlockDate;
    
    // তারিখ ফরম্যাট (e.g. 12 Aug 2024)
    const dateString = data.created_at ? data.created_at.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';

    let statusHtml = "";
    let buttonHtml = "";

    // স্ট্যাটাস লজিক চেক
    if (data.status === 'paid') {
        statusHtml = `<p class="unlock-time" style="color:#4caf50"><i class="fa-solid fa-check-double"></i> Paid</p>`;
        buttonHtml = `<button class="btn-action paid">Completed</button>`;
    } 
    else if (data.status === 'pending') {
        statusHtml = `<p class="unlock-time" style="color:#ffa000"><i class="fa-regular fa-clock"></i> Processing...</p>`;
        buttonHtml = `<button class="btn-action disabled">Request Sent</button>`;
    }
    else if (data.status === 'rejected') {
        statusHtml = `<p class="unlock-time" style="color:#e53935"><i class="fa-solid fa-circle-xmark"></i> Rejected</p>`;
        buttonHtml = `<button class="btn-action disabled" style="border: 1px solid #e53935; color: #e53935;">Contact Admin</button>`;
    } 
    else if (isLocked) {
        // === কাস্টম টাইমার হিসাব (দিন, ঘন্টা, মিনিট) ===
        const diffTime = Math.abs(unlockDate - today);
        
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const diffMins = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));

        // সময় দেখানোর ফরম্যাট তৈরি করা
        let timeText = "";
        if(diffDays > 0) timeText += `${diffDays}d `;
        if(diffHours > 0) timeText += `${diffHours}h `;
        timeText += `${diffMins}m`; // মিনিট সবসময় দেখাবে
        
        statusHtml = `<p class="unlock-time"><i class="fa-lock"></i> Unlocks in: <span style="color:#fff; font-weight:bold;">${timeText}</span></p>`;
        buttonHtml = `<button class="btn-action disabled">Locked</button>`;
    } 
    else {
        // আনলকড - উইথড্র করা যাবে
        statusHtml = `<p class="unlock-time" style="color:#4cd964"><i class="fa-solid fa-lock-open"></i> Ready to Withdraw</p>`;
        buttonHtml = `<button class="btn-action active" onclick="openWithdrawModal('${docId}', ${data.amount})">Withdraw Now</button>`;
    }

    // HTML রিটার্ন
    return `
        <div class="history-card">
            <div class="row-top">
                <span class="batch-id">@${data.sender_username || 'Unknown'}</span>
                <span class="star-pill">${data.amount} Stars</span>
            </div>
            <div class="row-mid">
                <p class="date">Sent: ${dateString}</p>
                ${statusHtml}
            </div>
            ${buttonHtml}
        </div>
    `;
}


// ============================================
// ৪. উইথড্র মোডাল হ্যান্ডলিং
// ============================================

const modal = document.getElementById('withdraw-modal');
const walletInput = document.getElementById('wallet-input');

// মোডাল ওপেন করা (Global Scope)
window.openWithdrawModal = function(batchId, amount) {
    currentWithdrawBatchId = batchId;
    document.getElementById('modal-star-amount').innerText = amount;
    walletInput.value = ""; 
    modal.classList.remove('hidden');
}

// মোডাল বন্ধ করা (Global Scope)
window.closeModal = function() {
    modal.classList.add('hidden');
    currentWithdrawBatchId = null;
}

// উইথড্র ফরম সাবমিট
document.getElementById('withdraw-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const address = walletInput.value.trim();
    if (!address || !currentWithdrawBatchId) return;

    const btn = e.target.querySelector('button');
    const oldText = btn.innerText;
    btn.innerText = "Submitting...";
    btn.disabled = true;

    // ১. withdrawals কালেকশনে রিকোয়েস্ট জমা
    db.collection("withdrawals").add({
        user_id: currentUser.id.toString(),
        username: currentUser.username,
        batch_id: currentWithdrawBatchId,
        wallet_address: address,
        amount: parseInt(document.getElementById('modal-star-amount').innerText),
        request_date: new Date(),
        status: 'pending'
    })
    .then(() => {
        // ২. star_batches এর স্ট্যাটাস আপডেট
        return db.collection("star_batches").doc(currentWithdrawBatchId).update({
            status: 'pending'
        });
    })
    .then(() => {
        alert("Withdraw request submitted successfully!");
        closeModal();
        btn.innerText = oldText;
        btn.disabled = false;
    })
    .catch((error) => {
        console.error("Error:", error);
        alert("Something went wrong!");
        btn.innerText = oldText;
        btn.disabled = false;
    });
});
