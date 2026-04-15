/**
 * @description Service class to save CSV/XLSX data as ContentVersion with specified FirstPublishedLocationId
 * @author WSM Tools
 */
public with sharing class WSM_CSVContentVersionService {

    /**
     * @description Saves CSV content as a ContentVersion file linked to a specific record
     * @param csvContent The CSV file content as a string
     * @param fileName The name of the file (should include .csv extension)
     * @param firstPublishedLocationId The record ID where the file should be linked
     * @return ContentVersion The created ContentVersion record
     */
    @AuraEnabled
    public static ContentVersion saveCSVToRecord(String csvContent, String fileName, Id firstPublishedLocationId) {
        try {
            if (String.isBlank(csvContent)) {
                throw new AuraHandledException('CSV content cannot be empty');
            }
            if (String.isBlank(fileName)) {
                throw new AuraHandledException('File name cannot be empty');
            }
            if (firstPublishedLocationId == null) {
                throw new AuraHandledException('FirstPublishedLocationId cannot be null');
            }

            // Ensure filename has .csv extension
            if (!fileName.toLowerCase().endsWith('.csv')) {
                fileName += '.csv';
            }

            // Create ContentVersion record
            ContentVersion cv = new ContentVersion();
            cv.Title = fileName.substringBeforeLast('.');
            cv.PathOnClient = fileName;
            cv.VersionData = Blob.valueOf(csvContent);
            cv.FirstPublishLocationId = firstPublishedLocationId;
            cv.Origin = 'C'; // Content origin

            insert cv;

            // Query back the inserted record to get all fields
            cv = [SELECT Id, ContentDocumentId, Title, PathOnClient, FirstPublishLocationId
                  FROM ContentVersion
                  WHERE Id = :cv.Id
                  LIMIT 1];

            return cv;
        } catch (AuraHandledException e) {
            throw e;
        } catch (Exception e) {
            throw new AuraHandledException('Error saving CSV to record: ' + e.getMessage());
        }
    }

    /**
     * @description Saves binary file content (Base64-encoded) as a ContentVersion linked to a specific record.
     *              Used for XLSX and other binary file formats.
     * @param base64Content The file content as a Base64-encoded string
     * @param fileName The name of the file (should include extension, e.g. export.xlsx)
     * @param firstPublishedLocationId The record ID where the file should be linked
     * @return ContentVersion The created ContentVersion record
     */
    @AuraEnabled
    public static ContentVersion saveFileToRecord(String base64Content, String fileName, Id firstPublishedLocationId) {
        try {
            if (String.isBlank(base64Content)) {
                throw new AuraHandledException('File content cannot be empty');
            }
            if (String.isBlank(fileName)) {
                throw new AuraHandledException('File name cannot be empty');
            }
            if (firstPublishedLocationId == null) {
                throw new AuraHandledException('FirstPublishedLocationId cannot be null');
            }

            ContentVersion cv = new ContentVersion();
            cv.Title = fileName.contains('.') ? fileName.substringBeforeLast('.') : fileName;
            cv.PathOnClient = fileName;
            cv.VersionData = EncodingUtil.base64Decode(base64Content);
            cv.FirstPublishLocationId = firstPublishedLocationId;
            cv.Origin = 'C';

            insert cv;

            cv = [SELECT Id, ContentDocumentId, Title, PathOnClient, FirstPublishLocationId
                  FROM ContentVersion
                  WHERE Id = :cv.Id
                  LIMIT 1];

            return cv;
        } catch (AuraHandledException e) {
            throw e;
        } catch (Exception e) {
            throw new AuraHandledException('Error saving file to record: ' + e.getMessage());
        }
    }
}
