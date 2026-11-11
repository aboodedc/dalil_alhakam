/**
 * Class-diagram service methods, re-exported in one place.
 *
 * Mapping to the diagram:
 *   Book.setBookStatus        → setBookStatus
 *   Hadith.getCitation        → getCitation
 *   User.register             → register
 *   User.login                → login
 *   User.askQuestion          → askQuestion
 *   User.createFolder         → createFolder
 *   Folder.addHadith          → addHadith
 *   SearchQuery.getResults    → getResults
 *   User.rateHadith           → rateHadith
 *   User.reportHadith         → reportHadith
 *   Report.submit             → reportHadith
 *   Report.resolve            → resolveReport
 *   Report.dismiss            → dismissReport
 *   SourceRequest.submit      → submitSourceRequest
 *   SourceRequest.review      → reviewSourceRequest
 */
export * from "./auth";
export * from "./books";
export * from "./folders";
export * from "./hadiths";
export * from "./history";
export * from "./ratings";
export * from "./reports";
export * from "./search";
export * from "./sources";
