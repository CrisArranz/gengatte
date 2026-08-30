import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renderiza el titulo de la aplicacion', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Gengatte' })).toBeInTheDocument()
  })
})
