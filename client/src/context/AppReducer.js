export default function appReducer(state, action) {
  switch (action.type) {
    case 'GET_TRANSACTIONS':
      return { ...state, loading: false, transactions: action.payload };
    case 'ADD_TRANSACTION':
      // newest first (matches the API's sort order)
      return { ...state, error: null, transactions: [action.payload, ...state.transactions] };
    case 'UPDATE_TRANSACTION':
      return {
        ...state,
        error: null,
        editing: null,
        transactions: state.transactions.map((t) =>
          t._id === action.payload._id ? action.payload : t
        )
      };
    case 'DELETE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.filter((t) => t._id !== action.payload)
      };
    case 'SET_EDITING':
      return { ...state, editing: action.payload };
    case 'CLEAR_EDITING':
      return { ...state, editing: null };

    case 'GET_ACCOUNTS':
      return { ...state, accounts: action.payload };
    case 'ADD_ACCOUNT':
      return { ...state, error: null, accounts: [...state.accounts, action.payload] };
    case 'DELETE_ACCOUNT':
      return { ...state, accounts: state.accounts.filter((a) => a._id !== action.payload) };

    case 'GET_SUMMARY':
      return { ...state, summary: action.payload };

    case 'TRANSACTION_ERROR':
      return { ...state, error: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}
