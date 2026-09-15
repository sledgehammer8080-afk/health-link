import { NavLink } from 'react-router-dom'

type SidebarItemProps = {
  path: string
  label: string
  icon?: string
  onNavigate?: () => void
}

export default function SidebarItem({ path, label, icon, onNavigate }: SidebarItemProps) {
  return (
    <NavLink
      to={path}
      onClick={onNavigate}
      className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
    >
      <span className="sidebar-link-main">
        {icon && <span className="sidebar-link-icon" aria-hidden="true">{icon}</span>}
        <span>{label}</span>
      </span>
      <span className="sidebar-link-badge">Current</span>
    </NavLink>
  )
}
