import { LightningElement, api } from 'lwc';

export default class Wsm_csv_output extends LightningElement {

    @api INCRecords = [];
    @api INCFieldSettingsJSON = ''; // E.G. [{"usedLabel":"Name","type":"recordfield","apiName":"Name"},{"usedLabel":"Row Number","type":"count","apiName":""}]
    @api INCPreamble;
    @api INCFileName;
    displayDownloadButton = false;
    downloadLink = '';
    ParsedFieldSettings;

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
        this.createDownloadFile(compiledCSVText);
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