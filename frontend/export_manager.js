class ExportManager {

    /**
     * Export expenses to Excel — opens as downloadable file
     */
    static exportToExcel(data) {
        console.log('[ExportManager] Generating Excel...');
        if (!window.XLSX) {
            alert('Excel library is loading. Please wait ~5 seconds and try again.');
            return;
        }

        try {
            const worksheetData = [
                ['Date', 'Description', 'Category', 'Amount (₹)', 'Type']
            ];
            data.forEach(exp => {
                worksheetData.push([
                    new Date(exp.date).toLocaleDateString(),
                    exp.description || 'N/A',
                    exp.category || 'other',
                    parseFloat(exp.amount),
                    exp.type || 'expense'
                ]);
            });

            const ws = XLSX.utils.aoa_to_sheet(worksheetData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Expenses');

            // Use XLSX built-in download (most compatible)
            XLSX.writeFile(wb, `Expenses_${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (err) {
            console.error('[ExportManager] Excel error:', err);
            alert('Failed to generate Excel. Error: ' + err.message);
        }
    }

    /**
     * Export expenses to PDF — opens in a NEW browser tab (most reliable)
     */
    static exportToPDF(data, title = 'Expense Report') {
        console.log('[ExportManager] Generating PDF...');

        // Support both window.jspdf.jsPDF and window.jsPDF
        const jsPDF = (window.jspdf && window.jspdf.jsPDF)
            ? window.jspdf.jsPDF
            : (window.jsPDF || null);

        if (!jsPDF) {
            console.error('[ExportManager] jsPDF not found. window.jspdf =', window.jspdf, 'window.jsPDF =', window.jsPDF);
            alert('PDF library failed to load. Please refresh the page (Ctrl+Shift+R) and try again.');
            return;
        }

        try {
            const doc = new jsPDF();

            // Header
            doc.setFontSize(20);
            doc.setTextColor(99, 102, 241);
            doc.text('Smart Daily Expense Tracker', 14, 22);

            doc.setFontSize(13);
            doc.setTextColor(80, 80, 80);
            doc.text(title, 14, 32);

            doc.setFontSize(9);
            doc.setTextColor(120, 120, 120);
            doc.text('Generated: ' + new Date().toLocaleString(), 14, 40);

            // Table
            const tableRows = data.map(exp => [
                new Date(exp.date).toLocaleDateString(),
                exp.description || 'N/A',
                (exp.category || 'other').charAt(0).toUpperCase() + (exp.category || 'other').slice(1),
                '₹' + parseFloat(exp.amount).toFixed(2)
            ]);

            const total = data.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
            tableRows.push(['', '', 'TOTAL', '₹' + total.toFixed(2)]);

            doc.autoTable({
                startY: 46,
                head: [['Date', 'Description', 'Category', 'Amount (₹)']],
                body: tableRows,
                theme: 'striped',
                headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
                footStyles: { fontStyle: 'bold' },
                styles: { fontSize: 10 },
            });

            // Open PDF in a new browser tab — most reliable, no download issues
            const pdfOutput = doc.output('datauristring');
            const newTab = window.open();
            if (newTab) {
                newTab.document.write(
                    '<iframe width="100%" height="100%" style="border:none;margin:0;padding:0;" src="' +
                    pdfOutput + '"></iframe>'
                );
            } else {
                // Fallback: trigger download if popup was blocked
                const link = document.createElement('a');
                link.href = pdfOutput;
                link.download = `Expense_Report_${new Date().toISOString().split('T')[0]}.pdf`;
                link.click();
            }

        } catch (err) {
            console.error('[ExportManager] PDF error:', err);
            alert('Failed to generate PDF. Error: ' + err.message);
        }
    }

    /**
     * Download monthly report for the current month
     */
    static downloadMonthlyReport(format = 'pdf') {
        const expenses = window.store.getExpenses();
        const now = new Date();
        const monthlyData = expenses.filter(exp => {
            const d = new Date(exp.date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });

        if (monthlyData.length === 0) {
            alert('No expenses found for ' + now.toLocaleString('default', { month: 'long', year: 'numeric' }) + '.');
            return;
        }

        const title = 'Monthly Report: ' + now.toLocaleString('default', { month: 'long' }) + ' ' + now.getFullYear();

        if (format === 'excel') {
            this.exportToExcel(monthlyData);
        } else {
            this.exportToPDF(monthlyData, title);
        }
    }
}

window.ExportManager = ExportManager;
