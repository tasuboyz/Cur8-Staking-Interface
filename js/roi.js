/**
 * Module per la gestione delle statistiche ROI di staking
 */
const ROIModule = {
    roiChart: null,
    steemData: null,
    hiveData: null,
    priceData: null,
    monthlyData: null,
    
    /**
     * Inizializza il modulo ROI
     */
    async init() {
        // Configura gli event listener specifici del ROI
        this.setupEventListeners();
        
        // Inizializza il tipo di investimento
        this.toggleInvestmentInput();
        
        // Carica i dati iniziali
        await this.fetchData();
    },
    
    /**
     * Configura gli event listener per il modulo ROI
     */
    setupEventListeners() {
        // ROI Calculate button
        const calcButton = document.querySelector('button[onclick="calculateROI()"]');
        if (calcButton) {
            calcButton.removeAttribute('onclick');
            calcButton.addEventListener('click', () => this.calculateROI());
        }
        
        // Investment type toggle
        const investmentType = document.getElementById('investmentType');
        if (investmentType) {
            investmentType.addEventListener('change', () => this.toggleInvestmentInput());
        }
    },
    
    /**
     * Alterna la visualizzazione dei campi di input in base al tipo di investimento
     */
    toggleInvestmentInput() {
        const type = document.getElementById('investmentType');
        if (!type) return;
        
        const value = type.value;
        const spGroup = document.getElementById('spInputGroup');
        const usdGroup = document.getElementById('usdInputGroup');
        
        if (spGroup) spGroup.style.display = value === 'sp' ? 'block' : 'none';
        if (usdGroup) usdGroup.style.display = value === 'usd' ? 'block' : 'none';
    },
    
    /**
     * Recupera i dati aggiornati da API reali
     */
    async fetchData() {
        try {
            const [steemData, hiveData, priceData] = await Promise.all([
                fetch("https://imridd.eu.pythonanywhere.com/api/steem").then(r => r.json()),
                fetch("https://imridd.eu.pythonanywhere.com/api/hive").then(r => r.json()),
                fetch("https://imridd.eu.pythonanywhere.com/api/prices").then(r => r.json())
            ]);
            
            this.steemData = steemData[0];
            this.hiveData = hiveData[0];
            this.priceData = priceData;
            
            // Aggiorna i valori nell'interfaccia
            this.updateDashboard();
            
            return {
                steem: this.steemData,
                hive: this.hiveData,
                prices: this.priceData
            };
        } catch (error) {
            console.error("Error fetching data:", error);
            // Valori di fallback in caso di errore
            this.steemData = { daily_APR: 7.5 };
            this.hiveData = { daily_APR: 8.0 };
            this.priceData = { "STEEM": 0.20, "HIVE": 0.22 };
            
            return {
                steem: this.steemData,
                hive: this.hiveData,
                prices: this.priceData
            };
        }
    },
    
    /**
     * Aggiorna il dashboard con i dati recuperati
     */
    updateDashboard() {
        const steemAPRElement = document.getElementById("steemAPR");
        const hivePriceElement = document.getElementById("steemPrice");
        
        if (steemAPRElement && this.steemData) {
            steemAPRElement.textContent = this.steemData.daily_APR.toFixed(2) + "%";
        }
        
        if (hivePriceElement && this.priceData) {
            hivePriceElement.textContent = "$" + this.priceData["STEEM"].toFixed(4);
        }
    },
    
    /**
     * Calcola e visualizza le statistiche ROI
     */
    async calculateROI() {
        if (!this.steemData || !this.priceData) {
            await this.fetchData();
        }
        
        const yearsInput = document.getElementById('yearsInput');
        const investmentTypeSelect = document.getElementById('investmentType');
        const spInput = document.getElementById('spInput');
        const usdInput = document.getElementById('usdInput');
        const roiResultDiv = document.getElementById('roiResult');
        
        if (!yearsInput || !investmentTypeSelect || !spInput || !usdInput || !roiResultDiv) {
            console.error('Missing required ROI elements');
            return;
        }
        
        const years = parseInt(yearsInput.value) || 1;
        const investmentType = investmentTypeSelect.value;
        const steemPrice = this.priceData["STEEM"];
        const annualAPR = this.steemData.daily_APR;
        
        let investment, spAmount;
        if (investmentType === 'sp') {
            spAmount = parseFloat(spInput.value) || 100;
            investment = spAmount * steemPrice;
        } else {
            investment = parseFloat(usdInput.value) || 100;
            spAmount = investment / steemPrice;
        }
        
        const dailyRate = annualAPR / 365 / 100;
        const monthlyData = [];
        
        for (let month = 1; month <= years * 12; month++) {
            const days = month * 30;
            const spValue = spAmount * Math.pow(1 + dailyRate, days);
            const usdValue = spValue * steemPrice;
            monthlyData.push({
                month: month,
                sp: spValue,
                usd: usdValue
            });
        }
        
        // Mostra risultati
        const finalMonth = monthlyData[monthlyData.length - 1];
        roiResultDiv.innerHTML = `
            <p>Investimento iniziale: ${spAmount.toFixed(2)} SP ($${investment.toFixed(2)})</p>
            <p>APR: ${annualAPR.toFixed(2)}%</p>
            <p>Dopo ${years} anni: ${finalMonth.sp.toFixed(2)} SP ($${finalMonth.usd.toFixed(2)})</p>
            <p>Profitto: ${(finalMonth.sp - spAmount).toFixed(2)} SP ($${(finalMonth.usd - investment).toFixed(2)})</p>
        `;
        
        this.updateROIChart(monthlyData);
    },
    
    /**
     * Aggiorna il grafico ROI con i dati calcolati
     */
    updateROIChart(monthlyData) {
        this.monthlyData = monthlyData; // Salva i dati per refresh
        
        const canvas = document.getElementById('roiChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        if (this.roiChart) {
            this.roiChart.destroy();
        }
        
        // Ottieni il colore del testo in base al tema
        const isDarkTheme = document.body.classList.contains('dark-theme');
        const textColor = isDarkTheme ? '#f1f1f1' : '#333333';
        
        this.roiChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: monthlyData.map(d => `Mese ${d.month}`),
                datasets: [
                    {
                        label: 'Valore in SP',
                        data: monthlyData.map(d => d.sp),
                        borderColor: '#4834d4',
                        backgroundColor: 'rgba(72, 52, 212, 0.1)',
                        fill: true,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Valore in USD',
                        data: monthlyData.map(d => d.usd),
                        borderColor: '#4cd137',
                        backgroundColor: 'rgba(76, 209, 55, 0.1)',
                        fill: true,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'STEEM POWER',
                            color: textColor
                        },
                        ticks: {
                            color: textColor
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'USD Value',
                            color: textColor
                        },
                        ticks: {
                            color: textColor
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    },
                    x: {
                        ticks: {
                            color: textColor
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: textColor
                        }
                    }
                }
            }
        });
    },
    
    /**
     * Aggiungi un metodo per aggiornare il grafico quando cambia il tema
     */
    refreshChart() {
        if (this.monthlyData && this.monthlyData.length > 0) {
            this.updateROIChart(this.monthlyData);
        }
    }
};

export { ROIModule };