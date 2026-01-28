/**
 * @description Test class for WSM_CSVContentVersionService
 * @author WSM Tools
 */
@IsTest
private class WSM_CSVContentVersionServiceTest {
    
    /**
     * @description Test successful CSV save to Account record
     */
    @IsTest
    static void testSaveCSVToRecord_Success() {
        // Create test Account to link the file to
        Account testAccount = new Account(Name = 'Test Account');
        insert testAccount;
        
        String csvContent = 'Name,Value\nTest,123';
        String fileName = 'test_export.csv';
        
        Test.startTest();
        ContentVersion result = WSM_CSVContentVersionService.saveCSVToRecord(
            csvContent,
            fileName,
            testAccount.Id
        );
        Test.stopTest();
        
        // Verify ContentVersion was created
        System.assertNotEquals(null, result, 'ContentVersion should not be null');
        System.assertNotEquals(null, result.Id, 'ContentVersion Id should not be null');
        System.assertNotEquals(null, result.ContentDocumentId, 'ContentDocumentId should not be null');
        System.assertEquals('test_export', result.Title, 'Title should match filename without extension');
        System.assertEquals(fileName, result.PathOnClient, 'PathOnClient should match filename');
        System.assertEquals(testAccount.Id, result.FirstPublishLocationId, 'FirstPublishLocationId should match');
        
        // Verify ContentDocumentLink was created
        List<ContentDocumentLink> links = [
            SELECT Id, LinkedEntityId, ContentDocumentId 
            FROM ContentDocumentLink 
            WHERE ContentDocumentId = :result.ContentDocumentId
            AND LinkedEntityId = :testAccount.Id
        ];
        System.assertEquals(1, links.size(), 'ContentDocumentLink should be created');
    }
    
    /**
     * @description Test that .csv extension is added if missing
     */
    @IsTest
    static void testSaveCSVToRecord_AddsCSVExtension() {
        Account testAccount = new Account(Name = 'Test Account');
        insert testAccount;
        
        String csvContent = 'Name,Value\nTest,123';
        String fileName = 'test_export'; // No .csv extension
        
        Test.startTest();
        ContentVersion result = WSM_CSVContentVersionService.saveCSVToRecord(
            csvContent,
            fileName,
            testAccount.Id
        );
        Test.stopTest();
        
        System.assertEquals('test_export.csv', result.PathOnClient, 'CSV extension should be added');
    }
    
    /**
     * @description Test error when CSV content is empty
     */
    @IsTest
    static void testSaveCSVToRecord_EmptyContent() {
        Account testAccount = new Account(Name = 'Test Account');
        insert testAccount;
        
        String csvContent = '';
        String fileName = 'test_export.csv';
        Boolean exceptionThrown = false;
        
        Test.startTest();
        try {
            WSM_CSVContentVersionService.saveCSVToRecord(
                csvContent,
                fileName,
                testAccount.Id
            );
        } catch (AuraHandledException e) {
            exceptionThrown = true;
            // AuraHandledException wraps message, just verify exception was thrown
        }
        Test.stopTest();
        
        System.assert(exceptionThrown, 'Expected AuraHandledException for empty content');
    }
    
    /**
     * @description Test error when CSV content is null
     */
    @IsTest
    static void testSaveCSVToRecord_NullContent() {
        Account testAccount = new Account(Name = 'Test Account');
        insert testAccount;
        
        String csvContent = null;
        String fileName = 'test_export.csv';
        Boolean exceptionThrown = false;
        
        Test.startTest();
        try {
            WSM_CSVContentVersionService.saveCSVToRecord(
                csvContent,
                fileName,
                testAccount.Id
            );
        } catch (AuraHandledException e) {
            exceptionThrown = true;
        }
        Test.stopTest();
        
        System.assert(exceptionThrown, 'Expected AuraHandledException for null content');
    }
    
    /**
     * @description Test error when filename is empty
     */
    @IsTest
    static void testSaveCSVToRecord_EmptyFileName() {
        Account testAccount = new Account(Name = 'Test Account');
        insert testAccount;
        
        String csvContent = 'Name,Value\nTest,123';
        String fileName = '';
        Boolean exceptionThrown = false;
        
        Test.startTest();
        try {
            WSM_CSVContentVersionService.saveCSVToRecord(
                csvContent,
                fileName,
                testAccount.Id
            );
        } catch (AuraHandledException e) {
            exceptionThrown = true;
        }
        Test.stopTest();
        
        System.assert(exceptionThrown, 'Expected AuraHandledException for empty filename');
    }
    
    /**
     * @description Test error when filename is null
     */
    @IsTest
    static void testSaveCSVToRecord_NullFileName() {
        Account testAccount = new Account(Name = 'Test Account');
        insert testAccount;
        
        String csvContent = 'Name,Value\nTest,123';
        String fileName = null;
        Boolean exceptionThrown = false;
        
        Test.startTest();
        try {
            WSM_CSVContentVersionService.saveCSVToRecord(
                csvContent,
                fileName,
                testAccount.Id
            );
        } catch (AuraHandledException e) {
            exceptionThrown = true;
        }
        Test.stopTest();
        
        System.assert(exceptionThrown, 'Expected AuraHandledException for null filename');
    }
    
    /**
     * @description Test error when FirstPublishedLocationId is null
     */
    @IsTest
    static void testSaveCSVToRecord_NullLocationId() {
        String csvContent = 'Name,Value\nTest,123';
        String fileName = 'test_export.csv';
        Boolean exceptionThrown = false;
        
        Test.startTest();
        try {
            WSM_CSVContentVersionService.saveCSVToRecord(
                csvContent,
                fileName,
                null
            );
        } catch (AuraHandledException e) {
            exceptionThrown = true;
        }
        Test.stopTest();
        
        System.assert(exceptionThrown, 'Expected AuraHandledException for null location id');
    }
    
    /**
     * @description Test with uppercase .CSV extension
     */
    @IsTest
    static void testSaveCSVToRecord_UppercaseExtension() {
        Account testAccount = new Account(Name = 'Test Account');
        insert testAccount;
        
        String csvContent = 'Name,Value\nTest,123';
        String fileName = 'test_export.CSV';
        
        Test.startTest();
        ContentVersion result = WSM_CSVContentVersionService.saveCSVToRecord(
            csvContent,
            fileName,
            testAccount.Id
        );
        Test.stopTest();
        
        // Should not add another .csv since it already has one (case insensitive check)
        System.assertEquals('test_export.CSV', result.PathOnClient, 'Uppercase CSV extension should be preserved');
    }
}
