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
    downloadLink = '';
    ParsedFieldSettings;
    csvContent = ''; // Store CSV content for save to record
    isSaving = false;

    connectedCallback() {
        this.ParsedFieldSettings = JSON.parse(this.INCFieldSettingsJSON);
        let BrokentIncRecords = JSON.parse(JSON.stringify(this.INCRecords));
        //let compiledHeaderTxt = this.createHeader(BrokentIncRecords);
        //let compiledRowsTxt = this.compileRowData(BrokentIncRecords);
        let compiledHeaderTxt = '';
        let compiledRowsTxt = this.compileRowDataForBiowerx(BrokentIncRecords);

        // fix text newlines in preamble
        let preamble = '';
        if (this.INCPreamble) {
            preamble = this.INCPreamble;
            preamble = preamble.replace(/\{newline\}/g, '\n\r'); 
            preamble = preamble.replace(/\,/g, ''); 
            preamble += '\n\r';
        }

        let compiledCSVText = preamble + compiledHeaderTxt + compiledRowsTxt;
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
        return this.isSaving ? 'SAVING...' : 'SAVE TO RECORD';
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


    compileRowDataForBiowerx(BrokentIncRecords) {
        try {

            let OutputText = '';
            console.log('Incoming Records: ', JSON.stringify(BrokentIncRecords));
            const map = new Map();
            for (const item of BrokentIncRecords) {
                if (!map.has(item.Name)) map.set(item.Name, { category: item.Name, data: [] });
                map.get(item.Name).data.push(item);
            }
            const CategorizedArray2 = Array.from(map.values());
            console.log('Categorized Array: ', JSON.stringify(CategorizedArray2));

            CategorizedArray2.forEach(Category => {

                let currentCategoryOutTXT = '\n\r' + Category.category + ',Serial Number,Expiration Date\n\r';
                currentCategoryOutTXT += this.compileRowData(Category.data);
                console.log('currentCategoryOutTXT: ', currentCategoryOutTXT);
                OutputText += currentCategoryOutTXT;
            });
            return OutputText;
        }
        catch (error) {
            console.log("Error in CompileRowDataForBiowerx: ", error.message);
        };


    }

    compileRowData(BrokentIncRecords) {

        console.log('Parsed Field Settings: ', this.ParsedFieldSettings);
        let outputRows = '';
        let loopnum = 0
        try {

            BrokentIncRecords.forEach(Record => {
                let currentRowOutText = '';
                this.ParsedFieldSettings.forEach(fieldSetting => {
                    if (fieldSetting.type === 'count') {
                        let rowNumber = loopnum + 1;
                        currentRowOutText += rowNumber + ',';
                    }
                    else if (fieldSetting.type === 'recordfield') {
                        currentRowOutText += this.normalizeOutputForRow(Record[fieldSetting.apiName]) + ',';
                    }
                });
                currentRowOutText += '\n';
                outputRows += currentRowOutText;
                loopnum++;
            });


        }
        catch (error) {
            console.log("Error in compileRowData", error.message);
        };

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