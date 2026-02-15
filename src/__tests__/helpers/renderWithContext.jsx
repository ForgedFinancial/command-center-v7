import { render } from '@testing-library/react'
import { AppProvider } from '../../context/AppContext'

export function renderWithContext(ui) {
  return render(<AppProvider>{ui}</AppProvider>)
}
