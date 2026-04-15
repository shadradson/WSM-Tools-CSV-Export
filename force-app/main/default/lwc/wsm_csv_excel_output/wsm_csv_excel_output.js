import { LightningElement, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { loadScript } from 'lightning/platformResourceLoader';
import sheetjs from '@salesforce/resourceUrl/sheetjs';
import saveCSVToRecord from '@salesforce/apex/WSM_CSVContentVersionService.saveCSVToRecord';
import saveFileToRecord from '@salesforce/apex/WSM_CSVContentVersionService.saveFileToRecord';

export default class Wsm_csv_excel_output extends LightningElement {

    @api INCRecords = [];
    @api INCFieldSettingsJSON = ''; // E.G. [{"usedLabel":"Name","type":"recordfield","apiName":"Name"},{"usedLabel":"Row Number","type":"count","apiName":""}]
    @api INCPreamble;
    @api INCFileName;
    @api INCFirstPublishedLocationId; // Record ID to link the saved file to
    displayDownloadButton = false;
    csvDownloadLink = '';
    ParsedFieldSettings;
    csvContent = ''; // Store CSV content for save to record
    isSavingCSV = false;
    isSavingXLSX = false;
    xlsxEnabled = false;
    summaryDataObject = [];
    allRows = []; // Array-of-arrays: [[header], [row1], [row2], ..., [summary]]
    preambleRows = []; // Preamble lines as rows for XLSX

    async connectedCallback() {
        // Load SheetJS library
        try {
            await loadScript(this, sheetjs);
            console.log('Loaded Sheetjs: ',);
            this.xlsxEnabled = true;
        } catch (error) {
            console.warn('SheetJS library not available, XLSX export disabled:', error);
        }

        this.ParsedFieldSettings = JSON.parse(this.INCFieldSettingsJSON);
        let records = JSON.parse(JSON.stringify(this.INCRecords));

        // Build array-of-arrays from records
        this.buildDataArrays(records);

        // Parse preamble into rows
        this.parsePreamble();

        // Generate CSV from arrays
        this.csvContent = this.generateCSVFromArrays();
        console.log('Full Output CSV Text: \n\n', this.csvContent);

        // Create CSV download link
        this.createCSVDownloadLink(this.csvContent);
    }

    /**
     * @description Builds the allRows array-of-arrays from records and field settings.
     *              Includes header row, data rows, and summary row.
     */
    buildDataArrays(records) {
        // Initialize summaryDataObject
        this.summaryDataObject = this.ParsedFieldSettings.map(fieldSetting => ({
            ...fieldSetting,
            sum_val: 0,
            total_rows: 0
        }));

        // Build header row
        let headerRow = this.ParsedFieldSettings.map(fieldSetting => fieldSetting.usedLabel);

        // Build data rows
        let dataRows = [];
        let rowIndex = 0;

        try {
            records.forEach(record => {
                let currentRow = [];
                let fieldNumber = 0;

                this.ParsedFieldSettings.forEach(fieldSetting => {
                    this.summaryDataObject[fieldNumber].total_rows += 1;

                    if (fieldSetting.type === 'count') {
                        currentRow.push(rowIndex + 1);
                    }
                    else if (fieldSetting.type === 'recordfield') {
                        let fieldValue = record[fieldSetting.apiName];

                        // Keep numeric values as numbers for XLSX type preservation
                        if (fieldSetting.summarize || fieldSetting.average) {
                            let numericValue = parseFloat(fieldValue) || 0;
                            this.summaryDataObject[fieldNumber].sum_val += numericValue;
                        }

                        // Push the raw value (preserve type for XLSX)
                        if (fieldValue === null || fieldValue === undefined) {
                            currentRow.push('');
                        } else {
                            currentRow.push(fieldValue);
                        }
                    }
                    else if (fieldSetting.type === 'hardCodedValue') {
                        currentRow.push(fieldSetting.value || '');
                    }

                    fieldNumber++;
                });

                dataRows.push(currentRow);
                rowIndex++;
            });
        }
        catch (error) {
            console.log('Error in buildDataArrays:', error.message);
        }

        // Build summary row
        let summaryRow = this.buildSummaryRow();

        // Assemble allRows
        this.allRows = [headerRow, ...dataRows];
        if (summaryRow) {
            this.allRows.push(summaryRow);
        }
    }

    /**
     * @description Builds the summary row array from summaryDataObject
     * @returns {Array|null} Summary row array or null if no summarizations
     */
    buildSummaryRow() {
        let hasSummarizations = this.summaryDataObject.some(field => field.summarize);
        let hasAverages = this.summaryDataObject.some(field => field.average);
        if (!hasSummarizations && !hasAverages) {
            return null;
        }

        let summaryRow = [];
        try {
            this.summaryDataObject.forEach(fieldData => {
                let cellValue = '';

                if (fieldData.summaryLabel) {
                    cellValue = fieldData.summaryLabel;
                }

                if (fieldData.summarize) {
                    cellValue += fieldData.sum_val;
                } else if (fieldData.average) {
                    let averageValue = fieldData.total_rows > 0 ? fieldData.sum_val / fieldData.total_rows : 0;
                    cellValue += averageValue;
                }

                summaryRow.push(cellValue);
            });
        }
        catch (error) {
            console.log('Error in buildSummaryRow:', error.message);
        }

        return summaryRow;
    }

    /**
     * @description Parses the INCPreamble into rows for use in XLSX and CSV
     */
    parsePreamble() {
        this.preambleRows = [];
        if (this.INCPreamble) {
            let preambleText = this.INCPreamble;
            preambleText = preambleText.replace(/\,/g, '');
            let lines = preambleText.split(/\{newline\}/g);
            lines.forEach(line => {
                this.preambleRows.push([line.trim()]);
            });
        }
    }

    /**
     * @description Converts the allRows AOA into a CSV string, including preamble
     * @returns {String} CSV-formatted text
     */
    generateCSVFromArrays() {
        let csvLines = [];

        // Add preamble rows
        this.preambleRows.forEach(row => {
            csvLines.push(row[0]);
        });
        if (this.preambleRows.length > 0) {
            csvLines.push(''); // blank line after preamble
        }

        // Add data rows (header + data + summary)
        this.allRows.forEach(row => {
            let csvRow = row.map(cell => this.normalizeOutputForRow(cell)).join(',');
            csvLines.push(csvRow);
        });

        return csvLines.join('\n\r');
    }

    /**
     * @description Creates a data URI download link for CSV
     */
    createCSVDownloadLink(csvText) {
        try {
            if (!csvText) return;
            const withBOM = '\uFEFF' + csvText;
            this.csvDownloadLink = 'data:text/csv;charset=utf-8,' + encodeURIComponent(withBOM);
            this.displayDownloadButton = true;
        } catch (e) {
            console.error('CSV download link creation failed:', e);
        }
    }

    // =========================================================================
    // Getters
    // =========================================================================

    get showSaveToRecordButton() {
        return this.displayDownloadButton && this.INCFirstPublishedLocationId;
    }

    get csvSaveButtonLabel() {
        return this.isSavingCSV ? 'SAVING...' : 'SAVE CSV';
    }

    get xlsxSaveButtonLabel() {
        return this.isSavingXLSX ? 'SAVING...' : 'SAVE XLSX';
    }

    get xlsxFileName() {
        if (!this.INCFileName) return 'export.xlsx';
        return this.INCFileName.replace(/\.csv$/i, '') + '.xlsx';
    }

    // =========================================================================
    // Download Handlers
    // =========================================================================

    /**
     * @description Generates and triggers an XLSX file download using SheetJS
     */
    handleDownloadXLSX() {
        if (!this.xlsxEnabled) return;

        try {
            // Build sheet data: preamble rows + blank row + allRows
            let sheetData = [];
            if (this.preambleRows.length > 0) {
                this.preambleRows.forEach(row => sheetData.push(row));
                sheetData.push([]); // blank row after preamble
            }
            this.allRows.forEach(row => sheetData.push(row));

            // eslint-disable-next-line no-undef
            const ws = XLSX.utils.aoa_to_sheet(sheetData);
            // eslint-disable-next-line no-undef
            const wb = XLSX.utils.book_new();
            // eslint-disable-next-line no-undef
            XLSX.utils.book_append_sheet(wb, ws, 'Export');

            // Auto-size columns based on header length
            let headerRowIndex = this.preambleRows.length > 0 ? this.preambleRows.length + 1 : 0;
            if (sheetData[headerRowIndex]) {
                ws['!cols'] = sheetData[headerRowIndex].map(header => {
                    let headerLen = String(header || '').length;
                    return { wch: Math.max(headerLen + 4, 12) };
                });
            }

            // eslint-disable-next-line no-undef
            XLSX.writeFile(wb, this.xlsxFileName);
        } catch (error) {
            console.error('XLSX download failed:', error);
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: 'Failed to generate XLSX file: ' + error.message,
                    variant: 'error'
                })
            );
        }
    }

    // =========================================================================
    // Save to Record Handlers
    // =========================================================================

    /**
     * @description Saves CSV file to a Salesforce record as a ContentVersion
     */
    handleSaveCSVToRecord() {
        if (this.isSavingCSV) return;
        this.isSavingCSV = true;

        const csvWithBOM = '\uFEFF' + this.csvContent;

        saveCSVToRecord({
            csvContent: csvWithBOM,
            fileName: this.INCFileName,
            firstPublishedLocationId: this.INCFirstPublishedLocationId
        })
            .then(result => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'CSV file saved to record successfully',
                        variant: 'success'
                    })
                );
                console.log('CSV ContentVersion created:', result);
            })
            .catch(error => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error',
                        message: error.body?.message || 'An error occurred while saving the CSV file',
                        variant: 'error'
                    })
                );
                console.error('Error saving CSV to record:', error);
            })
            .finally(() => {
                this.isSavingCSV = false;
            });
    }

    /**
     * @description Saves XLSX file to a Salesforce record as a ContentVersion (Base64)
     */
    handleSaveXLSXToRecord() {
        if (this.isSavingXLSX || !this.xlsxEnabled) return;
        this.isSavingXLSX = true;

        try {
            // Build the XLSX in memory
            let sheetData = [];
            if (this.preambleRows.length > 0) {
                this.preambleRows.forEach(row => sheetData.push(row));
                sheetData.push([]);
            }
            this.allRows.forEach(row => sheetData.push(row));

            // eslint-disable-next-line no-undef
            const ws = XLSX.utils.aoa_to_sheet(sheetData);
            // eslint-disable-next-line no-undef
            const wb = XLSX.utils.book_new();
            // eslint-disable-next-line no-undef
            XLSX.utils.book_append_sheet(wb, ws, 'Export');

            // Auto-size columns
            let headerRowIndex = this.preambleRows.length > 0 ? this.preambleRows.length + 1 : 0;
            if (sheetData[headerRowIndex]) {
                ws['!cols'] = sheetData[headerRowIndex].map(header => {
                    let headerLen = String(header || '').length;
                    return { wch: Math.max(headerLen + 4, 12) };
                });
            }

            // Write as base64
            // eslint-disable-next-line no-undef
            const xlsxBase64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });

            saveFileToRecord({
                base64Content: xlsxBase64,
                fileName: this.xlsxFileName,
                firstPublishedLocationId: this.INCFirstPublishedLocationId
            })
                .then(result => {
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: 'Success',
                            message: 'XLSX file saved to record successfully',
                            variant: 'success'
                        })
                    );
                    console.log('XLSX ContentVersion created:', result);
                })
                .catch(error => {
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: 'Error',
                            message: error.body?.message || 'An error occurred while saving the XLSX file',
                            variant: 'error'
                        })
                    );
                    console.error('Error saving XLSX to record:', error);
                })
                .finally(() => {
                    this.isSavingXLSX = false;
                });
        } catch (error) {
            console.error('XLSX generation failed:', error);
            this.isSavingXLSX = false;
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: 'Failed to generate XLSX file: ' + error.message,
                    variant: 'error'
                })
            );
        }
    }

    // =========================================================================
    // Utility
    // =========================================================================

    normalizeOutputForRow(incFieldData) {
        if (typeof incFieldData === 'boolean') {
            incFieldData = incFieldData ? 'TRUE' : 'FALSE';
        }
        if (incFieldData === null || incFieldData === undefined) {
            return '';
        }

        const cleanedTxt = String(incFieldData);
        // If contains quote, comma, CR or LF, wrap and escape quotes
        if (/[",\r\n]/.test(cleanedTxt)) {
            return `"${cleanedTxt.replace(/"/g, '""')}"`;
        }

        return cleanedTxt;
    }

    renderedCallback() {

    }
}
