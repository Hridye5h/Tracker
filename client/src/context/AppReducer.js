export default function appReducer(state, action) {
  switch (action.type) {
    case 'GET_TRANSACTIONS':
      return { ...state, loading: false, transactions: action.payload };
    case 'ADD_TRANSACTION':
      // newest first (matches the API's sort order)
      return { ...state, transactions: [action.payload, ...state.transactions] };
    case 'UPDATE_TRANSACTION':
      return {
        ...state,
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
      return { ...state, accounts: [...state.accounts, action.payload] };
    case 'DELETE_ACCOUNT':
      return { ...state, accounts: state.accounts.filter((a) => a._id !== action.payload) };

    case 'TRANSACTION_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
}
