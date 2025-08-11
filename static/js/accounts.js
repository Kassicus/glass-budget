// Account Management JavaScript
class AccountManager {
    constructor() {
        this.accounts = [];
        this.filteredAccounts = [];
        this.currentSort = 'name';
        this.currentTypeFilter = '';
        this.currentStatusFilter = '';
        this.searchTerm = '';
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Filter controls
        const typeFilter = document.getElementById('accountTypeFilter');
        const statusFilter = document.getElementById('accountStatusFilter');
        const searchInput = document.getElementById('accountSearchInput');
        const sortSelect = document.getElementById('sortAccountsBy');
        const exportBtn = document.getElementById('exportAccountsBtn');
        
        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                this.currentTypeFilter = e.target.value;
                this.filterAndDisplayAccounts();
            });
        }
        
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.currentStatusFilter = e.target.value;
                this.filterAndDisplayAccounts();
            });
        }
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.filterAndDisplayAccounts();
            });
        }
        
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.currentSort = e.target.value;
                this.filterAndDisplayAccounts();
            });
        }
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportAccountData();
            });
        }
    }
    
    async loadAccountsData() {
        try {
            const response = await fetch('/api/accounts');
            this.accounts = await response.json();
            this.filteredAccounts = [...this.accounts];
            
            this.displayAccountStats();
            this.displayAccountsTable();
            this.displayAccountAnalytics();
            
        } catch (error) {
            console.error('Error loading accounts:', error);
        }
    }
    
    filterAndDisplayAccounts() {
        // Start with all accounts
        this.filteredAccounts = [...this.accounts];
        
        // Apply type filter
        if (this.currentTypeFilter) {
            this.filteredAccounts = this.filteredAccounts.filter(account => 
                account.account_type === this.currentTypeFilter
            );
        }
        
        // Apply status filter (assuming we add an active/inactive field later)
        if (this.currentStatusFilter) {
            this.filteredAccounts = this.filteredAccounts.filter(account => {
                // For now, all accounts are considered active
                return this.currentStatusFilter === 'active';
            });
        }
        
        // Apply search filter
        if (this.searchTerm) {
            this.filteredAccounts = this.filteredAccounts.filter(account => 
                account.name.toLowerCase().includes(this.searchTerm)
            );
        }
        
        // Apply sorting
        this.filteredAccounts.sort((a, b) => {
            switch (this.currentSort) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'balance':
                    return (a.account_type === 'credit' ? -a.current_balance : a.balance) - 
                           (b.account_type === 'credit' ? -b.current_balance : b.balance);
                case 'type':
                    return a.account_type.localeCompare(b.account_type);
                case 'created':
                    return new Date(a.created_at) - new Date(b.created_at);
                default:
                    return 0;
            }
        });
        
        this.displayAccountsTable();
        this.displayAccountAnalytics();
    }
    
    displayAccountStats() {
        let totalBalance = 0;
        let totalAssets = 0;
        let totalDebt = 0;
        let creditAccounts = [];
        
        this.accounts.forEach(account => {
            if (account.account_type === 'credit') {
                totalDebt += account.current_balance;
                totalBalance -= account.current_balance;
                creditAccounts.push(account);
            } else {
                totalAssets += account.balance;
                totalBalance += account.balance;
            }
        });
        
        // Calculate average credit utilization
        let avgUtilization = 0;
        if (creditAccounts.length > 0) {
            const totalUtilization = creditAccounts.reduce((sum, account) => {
                if (account.credit_limit && account.credit_limit > 0) {
                    return sum + (account.current_balance / account.credit_limit);
                }
                return sum;
            }, 0);
            avgUtilization = (totalUtilization / creditAccounts.length) * 100;
        }
        
        // Update DOM elements
        document.getElementById('totalAccountBalance').textContent = `$${totalBalance.toFixed(2)}`;
        document.getElementById('totalAssets').textContent = `$${totalAssets.toFixed(2)}`;
        document.getElementById('totalDebt').textContent = `$${totalDebt.toFixed(2)}`;
        document.getElementById('avgCreditUtilization').textContent = `${avgUtilization.toFixed(1)}%`;
    }
    
    displayAccountsTable() {
        const tbody = document.getElementById('accountsTableBody');
        if (!tbody) return;
        
        if (this.filteredAccounts.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.6);">
                        No accounts found matching your criteria
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = this.filteredAccounts.map(account => `
            <tr>
                <td class="account-name-cell">${account.name}</td>
                <td>
                    <span class="account-type-badge ${account.account_type}">
                        ${account.account_type}
                    </span>
                </td>
                <td class="account-balance-cell ${this.getBalanceClass(account)}">
                    ${this.formatAccountBalance(account)}
                </td>
                <td class="credit-info-cell">
                    ${this.formatCreditInfo(account)}
                </td>
                <td>${new Date(account.created_at).toLocaleDateString()}</td>
                <td class="account-actions">
                    <button class="btn btn-small btn-secondary" onclick="editAccount(${account.id})">
                        Edit
                    </button>
                    <button class="btn btn-small btn-outline" onclick="deleteAccount(${account.id})">
                        Delete
                    </button>
                </td>
            </tr>
        `).join('');
    }
    
    getBalanceClass(account) {
        if (account.account_type === 'credit') {
            return account.current_balance > 0 ? 'negative' : 'positive';
        }
        return account.balance >= 0 ? 'positive' : 'negative';
    }
    
    formatAccountBalance(account) {
        if (account.account_type === 'credit') {
            return `$${account.current_balance.toFixed(2)}`;
        }
        return `$${account.balance.toFixed(2)}`;
    }
    
    formatCreditInfo(account) {
        if (account.account_type !== 'credit' || !account.credit_limit) {
            return '-';
        }
        
        const utilization = (account.current_balance / account.credit_limit) * 100;
        const utilizationClass = utilization > 80 ? 'high' : utilization > 50 ? 'medium' : 'low';
        
        return `
            <div class="credit-limit">Limit: $${account.credit_limit.toFixed(2)}</div>
            <div class="credit-utilization ${utilizationClass}">
                ${utilization.toFixed(1)}% utilized
            </div>
        `;
    }
    
    displayAccountAnalytics() {
        const accountTypes = {};
        
        this.filteredAccounts.forEach(account => {
            accountTypes[account.account_type] = (accountTypes[account.account_type] || 0) + 1;
        });
        
        // Update breakdown counts
        document.getElementById('checkingCount').textContent = accountTypes.checking || 0;
        document.getElementById('savingsCount').textContent = accountTypes.savings || 0;
        document.getElementById('creditCount').textContent = accountTypes.credit || 0;
        document.getElementById('investmentCount').textContent = accountTypes.investment || 0;
    }
    
    exportAccountData() {
        const csvData = this.convertAccountsToCSV();
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `accounts-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }
    
    convertAccountsToCSV() {
        const headers = ['Name', 'Type', 'Balance', 'Credit Limit', 'Current Balance', 'Created Date'];
        const rows = this.accounts.map(account => [
            account.name,
            account.account_type,
            account.balance.toFixed(2),
            account.credit_limit ? account.credit_limit.toFixed(2) : '',
            account.current_balance ? account.current_balance.toFixed(2) : '',
            new Date(account.created_at).toISOString().split('T')[0]
        ]);
        
        return [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\\n');
    }
}

// Global functions for account actions (called from table buttons)
window.editAccount = function(accountId) {
    const account = window.accountManager.accounts.find(acc => acc.id === accountId);
    if (!account) return;
    
    // Populate the modal with account data
    document.getElementById('accountName').value = account.name;
    document.getElementById('accountType').value = account.account_type;
    document.getElementById('accountBalance').value = account.balance;
    
    if (account.account_type === 'credit') {
        document.getElementById('creditLimit').value = account.credit_limit || '';
        document.getElementById('currentBalance').value = account.current_balance || 0;
    }
    
    // Set modal to edit mode
    document.getElementById('accountModalTitle').textContent = 'Edit Account';
    document.getElementById('accountModal').setAttribute('data-account-id', accountId);
    
    // Open modal
    if (typeof openModal === 'function') {
        openModal('accountModal');
    }
};

window.deleteAccount = function(accountId) {
    const account = window.accountManager.accounts.find(acc => acc.id === accountId);
    if (!account) return;
    
    if (confirm(`Are you sure you want to delete "${account.name}"? This action cannot be undone.`)) {
        // Call the existing delete account function
        if (typeof deleteAccountById === 'function') {
            deleteAccountById(accountId);
        }
    }
};

// Initialize account manager when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    window.accountManager = new AccountManager();
});