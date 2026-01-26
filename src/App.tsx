import ErrorBoundary from './components/ErrorBoundary'
import ExpenseTracker from './components/ExpenseTracker'
import { DataProvider } from './contexts/ExpenseContext'
import { UIProvider } from './contexts/UIContext'
import { ModalProvider } from './contexts/ModalContext'

function App() {
  return (
    <ErrorBoundary>
      <DataProvider>
        <UIProvider>
          <ModalProvider>
            <ExpenseTracker />
          </ModalProvider>
        </UIProvider>
      </DataProvider>
    </ErrorBoundary>
  )
}

export default App

