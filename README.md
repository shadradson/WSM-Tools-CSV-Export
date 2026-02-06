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
| `average` | `Boolean` | No | If `true`, calculates the average of this field's values and displays it in the summary row |
| `summaryLabel` | `String` | No | Text to prepend in the summary row cell (e.g., "Total:", "Avg:"). Can be combined with `summarize` or `average` |

### Field Types

| Type | Description |
|------|-------------|
| `recordfield` | Pulls the value from the record using the `apiName` property |
| `count` | Auto-incrementing row number (1, 2, 3, ...) |
| `hardCodedValue` | Uses the static `value` property for every row |

---

## Row Summarization & Averages

The component supports automatic summarization (sums and averages) of numeric fields. When any field has `summarize: true` or `average: true`, a summary row is appended to the end of the CSV output.

### Summarization Properties

| Property | Type | Description |
|----------|------|-------------|
| `summarize` | `Boolean` | Calculates the **sum** of all values in this column |
| `average` | `Boolean` | Calculates the **average** of all values in this column |
| `summaryLabel` | `String` | Text to prepend in the summary cell (e.g., "Total:", "Avg:") |

### How to Enable Summarization

Add the following properties to your field settings:

1. **`summarize: true`** - Add this to any `recordfield` that contains numeric data you want to sum
2. **`average: true`** - Add this to any `recordfield` that contains numeric data you want to average
3. **`summaryLabel`** (optional) - Add this to any field where you want a label to appear in the summary row

> **Note**: You can combine `summaryLabel` with either `summarize` or `average` to display both a label and a calculated value in the same cell.

### Summarization Example (Sum)

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

**Output:**
```
Item Name,Quantity,Unit Price,Line Total,
Widget A,10,25.00,250.00,
Widget B,5,50.00,250.00,
Widget C,20,10.00,200.00,
TOTAL:,35,85.00,700.00,
```

### Average Example

```json
[
    {
        "usedLabel": "Student Name",
        "type": "recordfield",
        "apiName": "Name",
        "summaryLabel": "CLASS AVERAGE:"
    },
    {
        "usedLabel": "Test Score",
        "type": "recordfield",
        "apiName": "Test_Score__c",
        "average": true
    },
    {
        "usedLabel": "Attendance %",
        "type": "recordfield",
        "apiName": "Attendance_Percent__c",
        "average": true
    }
]
```

**Output:**
```
Student Name,Test Score,Attendance %,
Alice,92,98,
Bob,85,95,
Charlie,78,88,
CLASS AVERAGE:,85,93.67,
```

### Combined Label and Value Example

You can combine a label with a summarization in the same column:

```json
{
    "usedLabel": "Total Amount",
    "type": "recordfield",
    "apiName": "Amount__c",
    "summarize": true,
    "summaryLabel": "Grand Total: $"
}
```

This outputs: `Grand Total: $1500` in the summary row cell.

### Summarization Notes

- **Numeric Values Only**: Both `summarize` and `average` work with numeric fields. Non-numeric values are treated as `0`
- **Summary Row Position**: The summary row always appears at the end of the CSV, after all data rows
- **Empty Summary Cells**: Columns without `summarize`, `average`, or `summaryLabel` will have empty cells in the summary row
- **Multiple Calculations**: You can use `summarize` on some columns and `average` on others in the same export
- **Mutually Exclusive**: Use either `summarize` OR `average` on a single field, not both

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
