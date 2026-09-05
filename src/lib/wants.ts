// Bound on the one free-text answer the join form collects. Lives apart from the model so
// the client can enforce the same limit the server truncates to, without importing mongoose.
export const MAX_WANTS_LENGTH = 200;
