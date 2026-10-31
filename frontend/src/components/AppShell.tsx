import { NavLink, Outlet } from "react-router-dom";

const navigation = [
  ["/", "Dashboard"],
  ["/customers", "Customers"],
  ["/products", "Products"],
  ["/plans", "Plans"],
  ["/subscriptions", "Subscriptions"],
  ["/invoices", "Invoices"],
  ["/payments", "Payments"],
];

export function AppShell() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink className="brand" to="/" aria-label="PayDoo home">
          <span className="brand-mark">P</span>
          <span>Pay<span>Doo</span></span>
        </NavLink>
        <nav aria-label="Main navigation">
          {navigation.map(([path, label]) => (
            <NavLink key={path} to={path} end={path === "/"} className={({ isActive }) => `nav-link${isActive ? " is-active" : ""}`}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="live-dot" /> Live API workspace
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
