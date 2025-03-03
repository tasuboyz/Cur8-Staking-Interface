import { SteemAPI } from './js/steemAPI.js';
import { ROIModule } from './js/roi.js';

let currentUser = null;
let roiChart = null;

// Assicuriamoci che il codice venga eseguito dopo il caricamento del DOM
document.addEventListener('DOMContentLoaded', async function() {
    // Inizializza i moduli
    SteemAPI.init();
    
    // Verifica se Keychain è disponibile
    if (typeof steem_keychain === 'undefined') {
        console.warn('Steem Keychain non rilevato. Alcune funzioni potrebbero non funzionare.');
    }

    // Aggiungi gli event listener
    setupEventListeners();
    
    // Inizializza il modulo ROI se la tab è presente
    if (document.getElementById('roiTab')) {
        await ROIModule.init();
    }
});

// Funzione per impostare gli event listener
function setupEventListeners() {
    // Login button
    const loginButton = document.getElementById('loginButton');
    if (loginButton) {
        loginButton.addEventListener('click', handleLoginClick);
    }

    // Delegation form
    const delegateForm = document.getElementById('delegateForm');
    if (delegateForm) {
        delegateForm.addEventListener('submit', handleDelegationSubmit);
    }

    // Tab Navigation
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', handleTabClick);
    });
}

// Event handler per il login
function handleLoginClick() {
    const username = document.getElementById('accountName').value.toLowerCase();
    if (!username) {
        showMessage('Please enter your username', false);
        return;
    }
    
    if (typeof steem_keychain === 'undefined') {
        showMessage('Please install Steem Keychain extension', false);
        return;
    }

    loginWithKeychain(username);
}

// Event handler per la navigazione a tab
function handleTabClick() {
    // Rimuovi la classe active da tutti i pulsanti e i contenuti
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Aggiungi la classe active al pulsante cliccato e al contenuto corrispondente
    this.classList.add('active');
    document.getElementById(this.dataset.tab + 'Tab').classList.add('active');
}

// Handle delegation form submission
async function handleDelegationSubmit(e) {
    e.preventDefault();
    const newAmount = parseFloat(document.getElementById('amount').value);

    if (!newAmount) {
        showMessage('Please enter the amount to delegate', false, 'delegateMessage');
        return;
    }

    try {
        const currentDelegation = await getCurrentDelegation(currentUser, 'cur8');
        const account = await SteemAPI.getAccount(currentUser);

        const vestingShares = parseFloat(account.vesting_shares);
        const delegatedVestingShares = parseFloat(account.delegated_vesting_shares);
        const totalSP = await SteemAPI.vestsToHive(vestingShares);
        const delegatedSP = await SteemAPI.vestsToHive(delegatedVestingShares);
        const availableSP = totalSP - delegatedSP;

        const totalDelegation = currentDelegation + newAmount;

        if (newAmount > availableSP) {
            showMessage(`Cannot delegate more than available SP (${availableSP.toFixed(3)} SP)`, false, 'delegateMessage');
            return;
        }

        const confirmMessage = currentDelegation > 0 ? 
            `Current delegation: ${currentDelegation.toFixed(3)} SP\nNew delegation will be: ${totalDelegation.toFixed(3)} SP\nAvailable SP: ${availableSP.toFixed(3)} SP\nContinue?` :
            `Delegate ${totalDelegation.toFixed(3)} SP to @cur8\nAvailable SP: ${availableSP.toFixed(3)} SP\nContinue?`;

        if (!confirm(confirmMessage)) {
            return;
        }

        steem_keychain.requestDelegation(
            currentUser,
            'cur8',
            totalDelegation.toFixed(3),
            'SP',
            function(response) {
                if (response.success) {
                    showMessage(`Delegation updated to ${totalDelegation.toFixed(3)} SP successfully!`, true, 'delegateMessage');
                    document.getElementById('delegateForm').reset();
                    updateDelegations();
                    updateWalletInfo();
                    updateCurrentDelegationInfo();
                } else {
                    showMessage('Delegation failed: ' + response.message, false, 'delegateMessage');
                }
            }
        );
    } catch (error) {
        showMessage('Error processing delegation: ' + error.message, false, 'delegateMessage');
    }
}

// Modifica la funzione loginWithKeychain per includere updateWalletInfo
function loginWithKeychain(username) {
    steem_keychain.requestSignBuffer(username, 'Login to Delegation Interface', 'Posting', function(response) {
        if (response.success) {
            currentUser = username;
            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('mainContent').style.display = 'block';
            document.getElementById('walletInfo').style.display = 'grid';
            updateWalletInfo();
            updateDelegations();
            updateCurrentDelegationInfo();
        } else {
            showMessage('Login failed: ' + response.message, false);
        }
    });
}

function showMessage(message, isSuccess, elementId = 'loginMessage') {
    const messageElement = document.getElementById(elementId);
    if (messageElement) {
        messageElement.textContent = message;
        messageElement.className = 'message ' + (isSuccess ? 'success' : 'error');
    }
}

// Aggiungi questa funzione per aggiornare la tabella delle delegazioni
async function updateDelegations() {
    try {
        const delegations = await SteemAPI.getDelegations(currentUser);

        const tableBody = document.querySelector('#delegationTable tbody');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';

        for (const delegation of delegations) {
            const row = document.createElement('tr');
            const spAmount = await SteemAPI.vestsToHive(parseFloat(delegation.vesting_shares));
            
            row.innerHTML = `
                <td>@${delegation.delegatee}</td>
                <td>${spAmount.toFixed(3)} SP</td>
                <td>${new Date(delegation.min_delegation_time).toLocaleDateString()}</td>
            `;
            tableBody.appendChild(row);
        }
    } catch (error) {
        console.error('Error updating delegations:', error);
    }
}

async function updateWalletInfo() {
    try {
        const account = await SteemAPI.getAccount(currentUser);

        const vestingShares = parseFloat(account.vesting_shares);
        const delegatedVestingShares = parseFloat(account.delegated_vesting_shares);
        const receivedVestingShares = parseFloat(account.received_vesting_shares);

        const totalSP = await SteemAPI.vestsToHive(vestingShares);
        const delegatedSP = await SteemAPI.vestsToHive(delegatedVestingShares);
        const receivedSP = await SteemAPI.vestsToHive(receivedVestingShares);
        const actualSP = totalSP - delegatedSP + receivedSP;
        const availableSP = totalSP - delegatedSP;
        
        const steemPowerElement = document.getElementById('steemPower');
        const delegatedSPElement = document.getElementById('delegatedSP');
        const receivedSPElement = document.getElementById('receivedSP');
        const availableSPElement = document.getElementById('availableSP');
        
        if (steemPowerElement) steemPowerElement.textContent = `${actualSP.toFixed(3)} SP`;
        if (delegatedSPElement) delegatedSPElement.textContent = `${delegatedSP.toFixed(3)} SP`;
        if (receivedSPElement) receivedSPElement.textContent = `${receivedSP.toFixed(3)} SP`;
        if (availableSPElement) availableSPElement.textContent = `${availableSP.toFixed(3)} SP`;

        // Aggiorna il placeholder dell'input con lo SP disponibile
        const amountInput = document.getElementById('amount');
        if (amountInput) {
            amountInput.setAttribute('max', availableSP.toFixed(3));
            amountInput.setAttribute('placeholder', `Enter amount (max: ${availableSP.toFixed(3)} SP)`);
        }
    } catch (error) {
        console.error('Error updating wallet info:', error);
    }
}

async function getCurrentDelegation(delegator, delegatee) {
    try {
        const delegations = await SteemAPI.getDelegations(delegator, delegatee, 1);

        if (delegations.length > 0 && delegations[0].delegatee === delegatee) {
            return await SteemAPI.vestsToHive(parseFloat(delegations[0].vesting_shares));
        }
        return 0;
    } catch (error) {
        console.error('Error getting current delegation:', error);
        return 0;
    }
}

async function updateCurrentDelegationInfo() {
    try {
        const currentDelegation = await getCurrentDelegation(currentUser, 'cur8');
        const element = document.getElementById('currentDelegationAmount');
        if (element) {
            element.textContent = `${currentDelegation.toFixed(3)} SP`;
        }
    } catch (error) {
        console.error('Error updating current delegation info:', error);
    }
}