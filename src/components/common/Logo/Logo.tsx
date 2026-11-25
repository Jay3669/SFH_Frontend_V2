import logo from '../../../assets/logos/sfh-logo.png'

export function Logo({ className = '', showName = true }: { className?: string; showName?: boolean }) {
  return (
    <a className={`brand-lockup ${className}`.trim()} href="/" aria-label="Surya Food Hub">
      <img src={logo} alt="" />
      {showName && <span>Surya <b>Food Hub</b></span>}
    </a>
  )
}
