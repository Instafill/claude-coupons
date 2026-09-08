// Bound on the free-text answer the join form used to collect. Nothing writes it any more -
// the question was removed - but the rows that answered still hold a string, so the model
// keeps typing them. Lives apart from the model so nothing has to import mongoose for it.
export const MAX_WANTS_LENGTH = 200;
