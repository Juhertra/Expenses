import ErrorBoundary from './components/ErrorBoundary'
import ExpenseTracker from './components/ExpenseTracker'

function App() {
  return (
    <ErrorBoundary>
      <ExpenseTracker />
    </ErrorBoundary>
  )
}

export default App

