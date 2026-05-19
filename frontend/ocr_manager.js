class OCRManager {
    static async processReceipt(file, onProgress) {
        if (!window.Tesseract) {
            console.error('Tesseract not loaded');
            throw new Error('OCR library not loaded.');
        }

        try {
            const worker = await Tesseract.createWorker({
                logger: m => {
                    if (m.status === 'recognizing text') {
                        onProgress(m.status, Math.round(m.progress * 100));
                    } else {
                        onProgress(m.status, 0);
                    }
                }
            });

            await worker.loadLanguage('eng');
            await worker.initialize('eng');
            const { data: { text } } = await worker.recognize(file);
            await worker.terminate();

            console.log('[OCR-DEBUG] Extracted Raw Text:', text);
            return this.parseReceiptText(text);
        } catch (error) {
            console.error('[OCR-ERROR]', error);
            throw error;
        }
    }

    static parseReceiptText(text) {
        const result = {
            amount: null,
            date: null,
            description: 'Scanned Receipt',
            items: []
        };

        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        // 1. Extract Date
        const dateRegex = /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b/;
        for (const line of lines) {
            const dateMatch = line.match(dateRegex);
            if (dateMatch) {
                result.date = this.formatDate(dateMatch[1]);
                break;
            }
        }
        if (!result.date) result.date = new Date().toISOString().split('T')[0];

        // 2. Extract Potential Amounts & Items
        const priceRegex = /([₹$£€]?\s*)(\d+[\.,]\d{2})\b/;
        const potentialAmounts = [];
        
        lines.forEach((line, index) => {
            const priceMatch = line.match(priceRegex);
            if (priceMatch) {
                const price = parseFloat(priceMatch[2].replace(',', '.'));
                potentialAmounts.push(price);

                // Try to extract item name
                // Usually everything before the price is the name
                let name = line.replace(priceMatch[0], '').trim();
                
                // If name is very short or looks like a date/total label, skip adding as item
                const isTotalLabel = /total|subtotal|tax|vat|gst|sum|due|cash|change|amount/i.test(name);
                
                if (name.length > 2 && !isTotalLabel && !dateRegex.test(name)) {
                    // Check for quantity (e.g., "2 x 10.00" or "2 @ 10.00")
                    let quantity = 1;
                    const qtyMatch = name.match(/^(\d+)\s*[xX@*]\s*/);
                    if (qtyMatch) {
                        quantity = parseInt(qtyMatch[1]);
                        name = name.replace(qtyMatch[0], '').trim();
                    }

                    // Clean name from trailing/leading special chars
                    name = name.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');

                    if (name.length > 2) {
                        result.items.push({
                            name: name,
                            quantity: quantity,
                            price: price
                        });
                    }
                }
            }
        });

        // 3. Extract Total Amount
        if (potentialAmounts.length > 0) {
            // Check for explicit "Total" label first
            const totalLineRegex = /(?:total|sum|due|payable|amount)[\s:]*[₹$£€]?\s*(\d+[\.,]\d{2})/i;
            let explicitTotal = null;
            for (const line of lines) {
                const totalMatch = line.match(totalLineRegex);
                if (totalMatch) {
                    explicitTotal = parseFloat(totalMatch[1].replace(',', '.'));
                    break;
                }
            }
            
            result.amount = explicitTotal || Math.max(...potentialAmounts);
        }

        // 4. Extract Merchant Name (Description)
        // Usually the first few non-empty lines that don't contain price or date
        for (let i = 0; i < Math.min(lines.length, 5); i++) {
            const line = lines[i];
            if (!priceRegex.test(line) && !dateRegex.test(line) && line.length > 3) {
                result.description = line.substring(0, 40);
                break;
            }
        }

        return result;
    }

    static formatDate(dateStr) {
        try {
            const parts = dateStr.split(/[\/\-\.]/);
            if (parts.length === 3) {
                let day, month, year;
                if (parts[2].length === 4) { // DD/MM/YYYY
                    day = parts[0]; month = parts[1]; year = parts[2];
                } else if (parts[0].length === 4) { // YYYY/MM/DD
                    year = parts[0]; month = parts[1]; day = parts[2];
                } else { // DD/MM/YY
                    day = parts[0]; month = parts[1]; year = '20' + parts[2];
                }
                
                // Swap if month > 12 (likely DD/MM format vs MM/DD)
                if (parseInt(month) > 12 && parseInt(day) <= 12) {
                    [day, month] = [month, day];
                }
                
                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
        } catch (e) {}
        return new Date().toISOString().split('T')[0];
    }
}

window.OCRManager = OCRManager;
