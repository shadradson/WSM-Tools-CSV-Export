import { LightningElement, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import saveCSVToRecord from '@salesforce/apex/WSM_CSVContentVersionService.saveCSVToRecord';

export default class Wsm_csv_output extends LightningElement {

    @api INCRecords = [];
    @api INCFieldSettingsJSON = ''; // E.G. [{"usedLabel":"Name","type":"recordfield","apiName":"Name"},{"usedLabel":"Row Number","type":"count","apiName":""}]
    @api INCPreamble;
    @api INCFileName;
    @api INCFirstPublishedLocationId; // Record ID to link the saved file to
    displayDownloadButton = false;
    displaySaveButton = false;
    downloadLink = '';
    ParsedFieldSettings;
    csvContent = ''; // Store CSV content for save to record
    isSaving = false;
    summaryDataObject = [];

    connectedCallback() {
        this.ParsedFieldSettings = JSON.parse(this.INCFieldSettingsJSON);
        let BrokentIncRecords = JSON.parse(JSON.stringify(this.INCRecords));
        //let compiledHeaderTxt = this.createHeader(BrokentIncRecords);
        //let compiledRowsTxt = this.compileRowData(BrokentIncRecords);
        let compiledHeaderTxt = '';
        let compiledRowsTxt = this.compileRowData(BrokentIncRecords);
        let compiledSummarization = this.compileSummarizations();

        // fix text newlines in preamble
        let preamble = '';
        if (this.INCPreamble) {
            preamble = this.INCPreamble;
            preamble = preamble.replace(/\{newline\}/g, '\n\r');
            preamble = preamble.replace(/\,/g, '');
            preamble += '\n\r';
        }

        let compiledCSVText = preamble + compiledHeaderTxt + compiledRowsTxt + compiledSummarization;
        console.log('Full Output CSV Text: \n\n', compiledCSVText);
        this.csvContent = compiledCSVText; // Store for save to record
        this.createDownloadFile(compiledCSVText);
    }

    /**
     * @description Getter to determine if save to record button should be shown
     * @returns {Boolean} True if FirstPublishedLocationId is provided
     */
    get showSaveToRecordButton() {
        return this.displayDownloadButton && this.INCFirstPublishedLocationId;
    }

    /**
     * @description Getter for save button label based on saving state
     * @returns {String} Button label text
     */
    get saveButtonLabel() {
        return this.isSaving ? 'SAVING...' : 'SAVE';
    }

    /**
     * @description Handles the save to record button click
     * Calls the Apex method to create a ContentVersion linked to the specified record
     */
    handleSaveToRecord() {
        if (this.isSaving) return;

        this.isSaving = true;

        // Add BOM for Excel compatibility
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
                console.log('ContentVersion created:', result);
            })
            .catch(error => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error',
                        message: error.body?.message || 'An error occurred while saving the file',
                        variant: 'error'
                    })
                );
                console.error('Error saving CSV to record:', error);
            })
            .finally(() => {
                this.isSaving = false;
            });
    }




    compileRowData(BrokentIncRecords) {
        console.log('Parsed Field Settings: ', this.ParsedFieldSettings);
        let outputRows = '';
        let loopnum = 0;
        
        // Initialize summaryDataObject with field settings and sum_val = 0
        this.summaryDataObject = this.ParsedFieldSettings.map(fieldSetting => ({
            ...fieldSetting,
            sum_val: 0
        }));
        
        try {
            BrokentIncRecords.forEach(Record => {
                let currentRowOutText = '';
                let fieldnumber = 0;
                
                // Create header row on first iteration
                if (loopnum === 0) {
                    this.ParsedFieldSettings.forEach(fieldSetting => {
                        currentRowOutText += this.normalizeOutputForRow(fieldSetting.usedLabel) + ',';
                    });
                    currentRowOutText += '\n';
                    outputRows += currentRowOutText;
                    currentRowOutText = '';
                }
                
                this.ParsedFieldSettings.forEach(fieldSetting => {
                    //console.log('Field Setting: ',JSON.stringify(fieldSetting));
                    if (fieldSetting.type === 'count') {
                        let rowNumber = loopnum + 1;
                        currentRowOutText += rowNumber + ',';
                    }
                    else if (fieldSetting.type === 'recordfield') {
                        let fieldValue = Record[fieldSetting.apiName];
                        currentRowOutText += this.normalizeOutputForRow(fieldValue) + ',';
                        
                        // Accumulate sum for fields with summarize: true
                        if (fieldSetting.summarize) {
                            let numericValue = parseFloat(fieldValue) || 0;
                            this.summaryDataObject[fieldnumber].sum_val += numericValue;
                        }
                    }
                    else if (fieldSetting.type === 'hardCodedValue') {
                        console.log('Hard Coded Value: ', JSON.stringify(fieldSetting));
                        currentRowOutText += this.normalizeOutputForRow(fieldSetting.value) + ',';
                    }
                    fieldnumber++;
                });
                currentRowOutText += '\n';
                outputRows += currentRowOutText;
                loopnum++;
            });

        }
        catch (error) {
            console.log("Error in compileRowData", error.message);
        }

        return outputRows;
    }

   

    createHeader() {
        let currentRowOutText = '';
        try {
            this.ParsedFieldSettings.forEach(fieldSetting => {
                currentRowOutText += this.normalizeOutputForRow(fieldSetting.usedLabel);
                currentRowOutText += ',';
            });
            currentRowOutText += '\n';
        }
        catch (error) {
            console.log("Error in createHeader: ", error.message);
        };
        return currentRowOutText
    }

    /**
     * @description Compiles the summary row based on fields with summarize: true
     * @returns {String} CSV-formatted summary row or empty string if no summarizations
     */
    compileSummarizations() {
        // Check if any field has summarize set to true
        let hasSummarizations = this.summaryDataObject.some(field => field.summarize);
        if (!hasSummarizations) {
            return '';
        }

        let summaryRowText = '';
        try {
            this.summaryDataObject.forEach(fieldData => {
                if (fieldData.summarize) {
                    // Output the accumulated sum value
                    summaryRowText += this.normalizeOutputForRow(fieldData.sum_val) + ',';
                } else if (fieldData.summaryLabel) {
                    // Output a label (e.g., "Total:") for non-summarized fields
                    summaryRowText += this.normalizeOutputForRow(fieldData.summaryLabel) + ',';
                } else {
                    // Empty cell for fields without summarization
                    summaryRowText += ',';
                }
            });
            summaryRowText += '\n';
        }
        catch (error) {
            console.log("Error in compileSummarizations: ", error.message);
        }
        return summaryRowText;
    }

    createDownloadFile(incCSVText) {
        try {
            if (!incCSVText) return;


            const csvText = '\uFEFF' + incCSVText;
            this.downloadLink = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvText);
            this.displayDownloadButton = true;

        } catch (e) {
            // eslint-disable-next-line no-console
            console.error('Download failed:', e);
        }
    }


    normalizeOutputForRow(incFieldData) {
        if (typeof cell === 'boolean') {
            incFieldData = incFieldData ? 'TRUE' : 'FALSE'
        };
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