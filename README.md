# WSM CSV Export Tool

A Lightning Web Component (LWC) that converts Salesforce records into CSV format with options to download or save directly to a record as a file attachment.

## Features

- **CSV Generation**: Converts record data into properly formatted CSV text
- **Download**: Download the CSV file directly to your device
- **Save to Record**: Save the CSV as a ContentVersion file attached to a specific Salesforce record
- **Flexible Field Configuration**: Supports dynamic field settings via JSON configuration
- **Excel Compatible**: Includes BOM (Byte Order Mark) for proper encoding in Excel

## Component Overview

### LWC: `wsm_csv_output`

The main Lightning Web Component that handles CSV generation and provides UI for download/save actions.

### Apex Class: `WSM_CSVContentVersionService`

Service class that creates ContentVersion records to save CSV files to Salesforce.

---

## Usage

To use this after deployment, 

---

## Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `INCRecords` | `Array` | Yes | Array of record objects to convert to CSV |
| `INCFieldSettingsJSON` | `String` | Yes | JSON string defining field configuration |
| `INCFileName` | `String` | Yes | Name for the downloaded/saved file (include .csv extension) |
| `INCPreamble` | `String` | No | Optional text to prepend to the CSV. Use `{newline}` for line breaks |
| `INCFirstPublishedLocationId` | `String` | No | Record ID to attach the file to when saving. If provided, shows "Save to Record" button |

---

## Field Settings JSON Format

The `INCFieldSettingsJSON` property accepts a JSON array defining how to process each field:

```json
[
    {
        "usedLabel": "Name",
        "type": "recordfield",
        "apiName": "Name"
    },
    {
        "usedLabel": "Row Number",
        "type": "count",
        "apiName": ""
    },
    {
        "usedLabel": "Serial Number",
        "type": "recordfield",
        "apiName": "Serial_Number__c"
    },
    {
        "usedLabel": "Serial Number",
        "type": "hardCodedValue",
        "value": "This is a value that will fill every row of this column."
    },
]
```

### Field Setting Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `usedLabel` | `String` | Yes | Column header label in the CSV |
| `type` | `String` | Yes | Field type: `"recordfield"`, `"count"`, or `"hardCodedValue"` |
| `apiName` | `String` | Conditional | API name of the field to pull (required for `recordfield` type) |
| `value` | `String` | Conditional | Static value to use for every row (required for `hardCodedValue` type) |
| `summarize` | `Boolean` | No | If `true`, adds a sum of this field's values in a summary row at the end |
| `summaryLabel` | `String` | No | Text to display in this column on the summary row (e.g., "Total:") |

### Field Types

| Type | Description |
|------|-------------|
| `recordfield` | Pulls the value from the record using the `apiName` property |
| `count` | Auto-incrementing row number (1, 2, 3, ...) |
| `hardCodedValue` | Uses the static `value` property for every row |

---

## Row Summarization

The component supports automatic summarization of numeric fields. When any field has `summarize: true`, a summary row is appended to the end of the CSV output.

### How to Enable Summarization

Add the following properties to your field settings:

1. **`summarize: true`** - Add this to any `recordfield` that contains numeric data you want to sum
2. **`summaryLabel`** (optional) - Add this to any field where you want a label to appear in the summary row (e.g., "Total:")

### Summarization Example

```json
[
    {
        "usedLabel": "Item Name",
        "type": "recordfield",
        "apiName": "Name",
        "summaryLabel": "TOTAL:"
    },
    {
        "usedLabel": "Quantity",
        "type": "recordfield",
        "apiName": "Quantity__c",
        "summarize": true
    },
    {
        "usedLabel": "Unit Price",
        "type": "recordfield",
        "apiName": "Unit_Price__c",
        "summarize": true
    },
    {
        "usedLabel": "Line Total",
        "type": "recordfield",
        "apiName": "Line_Total__c",
        "summarize": true
    }
]
```

### Example Output

Given the above configuration and sample data, the CSV output would be:

```
Item Name,Quantity,Unit Price,Line Total,
Widget A,10,25.00,250.00,
Widget B,5,50.00,250.00,
Widget C,20,10.00,200.00,
TOTAL:,35,85.00,700.00,
```

### Summarization Notes

- **Numeric Values Only**: The `summarize` feature works with numeric fields. Non-numeric values will be treated as `0`
- **Summary Row Position**: The summary row always appears at the end of the CSV, after all data rows
- **Empty Summary Cells**: Columns without `summarize: true` or `summaryLabel` will have empty cells in the summary row
- **Multiple Summarizations**: You can summarize multiple columns in the same export

---

## Examples

### Example 1: Simple Record Export

```javascript
// Parent Component JS
import { LightningElement } from 'lwc';

export default class MyExportComponent extends LightningElement {
    records = [
        { Name: 'Product A', Serial_Number__c: 'SN001', Expiration_Date__c: '2025-12-31' },
        { Name: 'Product B', Serial_Number__c: 'SN002', Expiration_Date__c: '2026-06-15' }
    ];
    
    fieldSettings = JSON.stringify([
        { usedLabel: 'Product Name', type: 'recordfield', apiName: 'Name' },
        { usedLabel: 'Serial Number', type: 'recordfield', apiName: 'Serial_Number__c' },
        { usedLabel: 'Expiration Date', type: 'recordfield', apiName: 'Expiration_Date__c' },
        { usedLabel: 'Currency', type: 'hardCodedValue', apiName: 'USD' }
    ]);
}
```

### Example 2: Save to Related Record

```javascript
// Parent Component JS
import { LightningElement, api } from 'lwc';

export default class ShipmentExport extends LightningElement {
    @api recordId; // The record to attach the file to
    
    shipmentItems = []; // Populated from wire service or Apex
    
    fieldSettings = JSON.stringify([
        { usedLabel: 'Row #', type: 'count', apiName: '' },
        { usedLabel: 'Item Name', type: 'recordfield', apiName: 'Name' },
        { usedLabel: 'Serial Number', type: 'recordfield', apiName: 'Serial_Number__c' }
    ]);
}
```


## Button Behavior

| Scenario | Download Button | Save to Record Button |
|----------|-----------------|----------------------|
| `INCFirstPublishedLocationId` NOT provided | ✅ Visible | ❌ Hidden |
| `INCFirstPublishedLocationId` IS provided | ✅ Visible | ✅ Visible |

---

## Deployment

Deploy to your Salesforce org using Salesforce CLI:

```bash
sf project deploy start --source-dir force-app
```

Or deploy with tests:

```bash
sf project deploy start --source-dir force-app --test-level RunSpecifiedTests --tests WSM_CSVContentVersionServiceTest
```

---

## Files Included

```
force-app/main/default/
├── classes/
│   ├── WSM_CSVContentVersionService.cls
│   ├── WSM_CSVContentVersionService.cls-meta.xml
│   ├── WSM_CSVContentVersionServiceTest.cls
│   └── WSM_CSVContentVersionServiceTest.cls-meta.xml
└── lwc/
    └── wsm_csv_output/
        ├── wsm_csv_output.html
        ├── wsm_csv_output.js
        ├── wsm_csv_output.css
        └── wsm_csv_output.js-meta.xml
```

---

## License

This project is provided by We Summit Mountains.
