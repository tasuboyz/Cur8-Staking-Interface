/**
 * Module per interagire con l'API di Steem blockchain
 */
const SteemAPI = {
    /**
     * Inizializza l'API Steem
     */
    init() {
        steem.api.setOptions({
            url: 'https://api.steemit.com'
        });
    },
    
    /**
     * Converte vests in STEEM POWER
     */
    async vestsToHive(vests) {
        return new Promise((resolve, reject) => {
            steem.api.getDynamicGlobalProperties(function(err, result) {
                if (err) {
                    reject(err);
                    return;
                }
                const totalVests = parseFloat(result.total_vesting_shares.split(' ')[0]);
                const totalHive = parseFloat(result.total_vesting_fund_steem.split(' ')[0]);
                const hivePerVest = totalHive / totalVests;
                const hive = parseFloat(vests) * hivePerVest;
                resolve(hive);
            });
        });
    },
    
    /**
     * Ottiene i dettagli di un account Steem
     */
    async getAccount(username) {
        return new Promise((resolve, reject) => {
            steem.api.getAccounts([username], (err, result) => {
                if (err) reject(err);
                else if (result && result.length > 0) resolve(result[0]);
                else reject(new Error('Account not found'));
            });
        });
    },
    
    /**
     * Ottiene le delegazioni attive di un utente
     */
    async getDelegations(delegator, delegatee = null, limit = 100) {
        return new Promise((resolve, reject) => {
            steem.api.getVestingDelegations(delegator, delegatee, limit, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });
    }
};

export { SteemAPI };