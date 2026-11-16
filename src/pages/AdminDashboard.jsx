import { useEffect, useState } from "react";
import UserManagement from "./UserManagement.jsx";
import RegularInventory from "./RegularInventory.jsx";
import DonationInventory from "./DonationInventory.jsx";
import MhmapInventory from "./MhmapInventory.jsx";
import MonthYearPicker from "../components/MonthYearPicker.jsx";
import MonthlyStockCard from "../components/MonthlyStockCard.jsx";
const donationWeeklyRanges = ["1-3", "4-10", "11-17", "18-24", "25-30"];
const dashboardSectionKeys = [
  "overview",
  "regular",
  "donation",
  "mhmap",
  "monthly-consumption",
  "inventory",
  "rpci-regular",
  "rpci-donation",
  "user-management",
];

function SidebarIcon({ name }) {
  const shapes = {
    overview: (
      <>
        <rect x="3.5" y="3.5" width="7" height="7" rx="1" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1" />
      </>
    ),
    estock: (
      <>
        <path d="m12 3 8.5 4.5L12 12 3.5 7.5 12 3Z" />
        <path d="M3.5 12 12 16.5l8.5-4.5M3.5 16.5 12 21l8.5-4.5M12 12v9" />
      </>
    ),
    monthly: (
      <>
        <path d="M4 19.5h16M6.5 16v-4m5 4V7m5 9v-6" />
        <path d="M4 4.5h16" />
      </>
    ),
    inventory: (
      <>
        <path d="m4 7 8-4 8 4v10l-8 4-8-4V7Z" />
        <path d="m4 7 8 4 8-4M12 11v10" />
      </>
    ),
    rpci: (
      <>
        <path d="M7 3.5h7l4 4v13H7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z" />
        <path d="M14 3.5v4h4M8.5 12h7M8.5 15.5h7" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 5.5a3.1 3.1 0 0 1 0 6M17 15a4.8 4.8 0 0 1 3.5 4.6" />
      </>
    ),
    movement: (
      <>
        <path d="M20 7v5h-5M4 17v-5h5" />
        <path d="M5.7 9A7 7 0 0 1 18 6.5L20 12M4 12l2 5.5A7 7 0 0 0 18.3 15" />
      </>
    ),
    reports: (
      <>
        <path d="M4 20V10m5 10V4m5 16v-7m5 7V7" />
        <path d="M2.5 20.5h19" />
      </>
    ),
  };
  return (
    <svg
      className="sidebar-icon sidebar-icon-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {shapes[name]}
    </svg>
  );
}

function getSavedDashboardSection() {
  const pathSegments = window.location.pathname.split("/").filter(Boolean);
  if (pathSegments[0] === "user-management") return "user-management";
  const pathSection = pathSegments.at(-1);
  if (pathSection === "dashboard") return "overview";
  if (dashboardSectionKeys.includes(pathSection)) return pathSection;

  const hashSection = window.location.hash.slice(1);
  if (dashboardSectionKeys.includes(hashSection)) return hashSection;
  if (["reports", "activity", "team"].includes(hashSection)) return "overview";

  try {
    const savedSection = window.sessionStorage.getItem(
      "pharma-dashboard-section",
    );
    return dashboardSectionKeys.includes(savedSection)
      ? savedSection
      : "overview";
  } catch {
    return "overview";
  }
}

function getInitialSidebarOpen() {
  return typeof window === "undefined" ? true : window.innerWidth > 760;
}

const sampleActivity = [
  {
    action: "Stock received",
    item: "Paracetamol 500 mg",
    detail: "Added 24 boxes",
    time: "Today, 9:42 AM",
    mark: "+",
  },
  {
    action: "Low stock alert",
    item: "Cetirizine 10 mg",
    detail: "9 boxes remaining",
    time: "Today, 8:15 AM",
    mark: "!",
  },
  {
    action: "Stock issued",
    item: "Omeprazole 20 mg",
    detail: "Issued 6 boxes",
    time: "Yesterday, 4:30 PM",
    mark: "−",
  },
];

export default function AdminDashboard({
  user,
  csrfToken,
  onLogout,
  submitting,
}) {
  const [stockMenuOpen, setStockMenuOpen] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(getInitialSidebarOpen);
  const [activeSection, setActiveSection] = useState(getSavedDashboardSection);
  const [stockMonth, setStockMonth] = useState("2026-11");
  const [stockYear, stockMonthNumber] = stockMonth.split("-").map(Number);
  const stockMonthLabel = new Date(
    stockYear,
    stockMonthNumber - 1,
    1,
  ).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  function navigateToSection(section) {
    setActiveSection(section);
    const route = section === "overview" ? "/dashboard" : `/${section}`;
    window.history.pushState({ section }, "", route);
    if (window.innerWidth <= 760) setSidebarOpen(false);
  }

  useEffect(() => {
    const currentRoute =
      activeSection === "overview" ? "/dashboard" : `/${activeSection}`;
    if (window.location.pathname === "/" || window.location.hash) {
      window.history.replaceState({ section: activeSection }, "", currentRoute);
    } else {
      window.history.replaceState(
        { ...window.history.state, section: activeSection },
        "",
      );
    }

    function handlePopState(event) {
      const section = dashboardSectionKeys.includes(event.state?.section)
        ? event.state.section
        : getSavedDashboardSection();
      setActiveSection(section);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    try {
      window.sessionStorage.setItem("pharma-dashboard-section", activeSection);
    } catch {
      // Keep navigation usable when browser storage is unavailable.
    }
  }, [activeSection]);

  const sectionTitles = {
    overview: "Dashboard",
    regular: "Regular inventory",
    donation: "Donation inventory",
    mhmap: "MHMAP inventory",
    "monthly-consumption": "Monthly Consumption",
    inventory: "Inventory",
    "rpci-regular": "RPCI Regular",
    "rpci-donation": "RPCI Donation",
    "user-management": "User Management",
  };
  const sectionTitle = sectionTitles[activeSection] || "Dashboard";

  return (
    <main
      className={`dashboard-shell ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}
    >
      {sidebarOpen && (
        <button
          className="sidebar-backdrop"
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`dashboard-sidebar ${sidebarOpen ? "is-open" : ""}`}
        id="admin-sidebar"
        aria-label="Workspace sidebar"
      >
        <div className="sidebar-brand-row">
          <a
            className="brand dashboard-brand"
            href="/"
            aria-label="JVGH Pharmacy home"
          >
            <span className="brand-mark" aria-hidden="true">
              +
            </span>
            <span>
              JVGH <strong>PHARMACY</strong>
            </span>
          </a>
          <button
            className="sidebar-toggle"
            type="button"
            aria-label={
              sidebarOpen ? "Collapse sidebar to icons" : "Expand sidebar"
            }
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            aria-expanded={sidebarOpen}
            aria-controls="admin-sidebar"
            onClick={() => setSidebarOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
          <button
            className="sidebar-mobile-close"
            type="button"
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="m5 5 10 10M15 5 5 15" />
            </svg>
          </button>
        </div>
        <p className="sidebar-caption">WORKSPACE</p>
        <nav className="sidebar-nav" aria-label="Admin navigation">
          <button
            className={`sidebar-link ${activeSection === "overview" ? "active" : ""}`}
            title="Overview"
            type="button"
            onClick={() => navigateToSection("overview")}
          >
            <SidebarIcon name="overview" />
            <span className="sidebar-label">Overview</span>
          </button>
          <div className={`sidebar-group ${stockMenuOpen ? "is-open" : ""}`}>
            <button
              className="sidebar-link sidebar-parent"
              type="button"
              title="E-STOCK"
              aria-label="Toggle E-STOCK submenu"
              aria-expanded={stockMenuOpen}
              onClick={() => setStockMenuOpen((open) => !open)}
            >
              <SidebarIcon name="estock" />
              <span className="sidebar-label">E-STOCK</span>
              <svg
                className="sidebar-chevron"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path d="m5.5 7.5 4.5 4.5 4.5-4.5" />
              </svg>
            </button>
            {stockMenuOpen && (
              <div className="sidebar-submenu">
                <button
                  className={`sidebar-sublink ${activeSection === "regular" ? "active" : ""}`}
                  title="Regular"
                  type="button"
                  onClick={() => navigateToSection("regular")}
                >
                  <span className="sidebar-submenu-icon">R</span>
                  <span className="sidebar-sublink-label">Regular</span>
                </button>
                <button
                  className={`sidebar-sublink ${activeSection === "donation" ? "active" : ""}`}
                  title="Donation"
                  type="button"
                  onClick={() => navigateToSection("donation")}
                >
                  <span className="sidebar-submenu-icon">D</span>
                  <span className="sidebar-sublink-label">Donation</span>
                </button>
                <button
                  className={`sidebar-sublink ${activeSection === "mhmap" ? "active" : ""}`}
                  title="MHMAP"
                  type="button"
                  onClick={() => navigateToSection("mhmap")}
                >
                  <span className="sidebar-submenu-icon">M</span>
                  <span className="sidebar-sublink-label">MHMAP</span>
                </button>
              </div>
            )}
          </div>
          <button
            className="sidebar-link"
            title="Stock Cards"
            type="button"
            onClick={() => navigateToSection("regular")}
          >
            <SidebarIcon name="estock" />
            <span className="sidebar-label">Stock Cards</span>
          </button>
          <button
            className={`sidebar-link ${activeSection === "monthly-consumption" ? "active" : ""}`}
            title="Monthly Consumption"
            type="button"
            onClick={() => navigateToSection("monthly-consumption")}
          >
            <SidebarIcon name="monthly" />
            <span className="sidebar-label">Monthly Consumption</span>
          </button>
          <button
            className={`sidebar-link ${activeSection === "inventory" ? "active" : ""}`}
            title="Inventory"
            type="button"
            onClick={() => navigateToSection("inventory")}
          >
            <SidebarIcon name="inventory" />
            <span className="sidebar-label">Inventory</span>
          </button>
          <button
            className={`sidebar-link ${activeSection === "rpci-regular" ? "active" : ""}`}
            title="RPCI Regular"
            type="button"
            onClick={() => navigateToSection("rpci-regular")}
          >
            <SidebarIcon name="rpci" />
            <span className="sidebar-label">RPCI Regular</span>
          </button>
          <button
            className={`sidebar-link ${activeSection === "rpci-donation" ? "active" : ""}`}
            title="RPCI Donation"
            type="button"
            onClick={() => navigateToSection("rpci-donation")}
          >
            <SidebarIcon name="rpci" />
            <span className="sidebar-label">RPCI Donation</span>
          </button>
          <button
            className={`sidebar-link ${activeSection === "user-management" ? "active" : ""}`}
            title="User Management"
            type="button"
            onClick={() => navigateToSection("user-management")}
          >
            <SidebarIcon name="users" />
            <span className="sidebar-label">User Management</span>
          </button>
          <button
            className="sidebar-link"
            title="Stock movements"
            type="button"
            onClick={() => navigateToSection("overview")}
          >
            <SidebarIcon name="movement" />
            <span className="sidebar-label">Stock movements</span>
            <small>Sample</small>
          </button>
          <button
            className="sidebar-link"
            title="Reports"
            type="button"
            onClick={() => navigateToSection("overview")}
          >
            <SidebarIcon name="reports" />
            <span className="sidebar-label">Reports</span>
            <small>Sample</small>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-user-mark">
            {user.fullName?.charAt(0)?.toUpperCase() || "A"}
          </div>
          <div className="sidebar-user-info">
            <strong>{user.fullName}</strong>
            <span>Administrator</span>
          </div>
          <button
            className="sidebar-logout"
            type="button"
            onClick={onLogout}
            disabled={submitting}
            aria-label="Sign out"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M10 17l5-5-5-5M15 12H3" />
              <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
            </svg>
          </button>
        </div>
      </aside>

      <section className="dashboard-main" id="overview">
        <header className="dashboard-header">
          <div className="dashboard-title-group">
            <div>
              <p className="eyebrow">PHARMACY INVENTORY SYSTEM</p>
              <h1>{sectionTitle}</h1>
            </div>
          </div>
          <div className="dashboard-header-actions">
            <span className="sample-indicator">
              <i /> Sample data
            </span>
            <button
              className="text-button"
              type="button"
              onClick={onLogout}
              disabled={submitting}
            >
              {submitting ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </header>

        {activeSection === "overview" && (
          <>
            <div className="dashboard-welcome">
              <div>
                <h2>Good day, {user.fullName?.split(" ")[0] || "Admin"}</h2>
                <p>Here’s what’s happening with your pharmacy today.</p>
              </div>
              <span className="dashboard-date">JVGH PHARMACY · ADMIN</span>
            </div>

            <section
              className="metric-grid"
              aria-label="Sample inventory summary"
            >
              <article className="metric-card">
                <div className="metric-label">
                  TOTAL MEDICINES <span className="metric-icon green">▤</span>
                </div>
                <strong>248</strong>
                <p>
                  <span className="metric-positive">+12</span> this month
                </p>
              </article>
              <article className="metric-card">
                <div className="metric-label">
                  LOW STOCK ITEMS <span className="metric-icon amber">!</span>
                </div>
                <strong>08</strong>
                <p>
                  <span className="metric-warning">Needs attention</span>
                </p>
              </article>
              <article className="metric-card">
                <div className="metric-label">
                  EXPIRING SOON <span className="metric-icon blue">◷</span>
                </div>
                <strong>03</strong>
                <p>Within the next 90 days</p>
              </article>
              <article className="metric-card">
                <div className="metric-label">
                  STOCK MOVEMENTS <span className="metric-icon violet">↗</span>
                </div>
                <strong>36</strong>
                <p>Recorded this month</p>
              </article>
            </section>

            <div className="dashboard-content-grid">
              <section className="dashboard-card movement-card" id="reports">
                <div className="card-heading">
                  <div>
                    <h2>Stock movement</h2>
                    <p>Sample activity this week</p>
                  </div>
                  <span className="period-chip">This week⌄</span>
                </div>
                <div className="chart-total">
                  <strong>126</strong>
                  <span>items moved</span>
                </div>
                <div
                  className="movement-chart"
                  role="img"
                  aria-label="Sample stock movement chart for Monday through Sunday"
                >
                  {[
                    { d: "Mon", a: 46, b: 25 },
                    { d: "Tue", a: 64, b: 38 },
                    { d: "Wed", a: 42, b: 52 },
                    { d: "Thu", a: 77, b: 37 },
                    { d: "Fri", a: 59, b: 49 },
                    { d: "Sat", a: 35, b: 22 },
                    { d: "Sun", a: 26, b: 16 },
                  ].map((day) => (
                    <div className="chart-day" key={day.d}>
                      <div className="chart-bars">
                        <i style={{ height: `${day.a}%` }} />
                        <i style={{ height: `${day.b}%` }} />
                      </div>
                      <span>{day.d}</span>
                    </div>
                  ))}
                </div>
                <div className="chart-legend">
                  <span>
                    <i className="legend-in" />
                    Stock received
                  </span>
                  <span>
                    <i className="legend-out" />
                    Stock issued
                  </span>
                </div>
              </section>

              <section className="dashboard-card activity-card" id="activity">
                <div className="card-heading">
                  <div>
                    <h2>Recent activity</h2>
                    <p>Latest sample stock updates</p>
                  </div>
                  <a href="#activity">
                    View all <span>→</span>
                  </a>
                </div>
                <div className="activity-list">
                  {sampleActivity.map((item) => (
                    <article
                      className="activity-row"
                      key={`${item.action}-${item.item}`}
                    >
                      <span
                        className={`activity-mark ${item.mark === "!" ? "activity-alert" : ""}`}
                      >
                        {item.mark}
                      </span>
                      <div className="activity-copy">
                        <strong>{item.action}</strong>
                        <span>
                          {item.item} · {item.detail}
                        </span>
                      </div>
                      <time>{item.time}</time>
                    </article>
                  ))}
                </div>
              </section>

              <section className="dashboard-card team-card" id="team">
                <div className="card-heading">
                  <div>
                    <h2>Team access</h2>
                    <p>Sample workspace summary</p>
                  </div>
                  <span className="team-icon">♙</span>
                </div>
                <div className="team-total">
                  <strong>06</strong>
                  <span>active staff accounts</span>
                </div>
                <div className="team-roles">
                  <span>
                    Admin <b>1</b>
                  </span>
                  <span>
                    Pharmacist <b>5</b>
                  </span>
                </div>
                <a className="team-link" href="#team">
                  Manage users <span>→</span>
                </a>
              </section>
            </div>
            <footer className="dashboard-footer">
              Dashboard preview · All inventory and activity figures shown are
              sample data.
            </footer>
          </>
        )}

        {activeSection === "regular" && (
          <RegularInventory
            stockMonth={stockMonth}
            onStockMonthChange={setStockMonth}
          />
        )}

        {activeSection === "donation" && (
          <DonationInventory
            stockMonth={stockMonth}
            onStockMonthChange={setStockMonth}
            monthLabel={stockMonthLabel}
          />
        )}

        {activeSection === "mhmap" && (
          <MhmapInventory
            stockMonth={stockMonth}
            onStockMonthChange={setStockMonth}
            monthLabel={stockMonthLabel}
          />
        )}

        {activeSection === "user-management" && (
          <UserManagement csrfToken={csrfToken} />
        )}

        {[
          "monthly-consumption",
          "inventory",
          "rpci-regular",
          "rpci-donation",
        ].includes(activeSection) && (
          <div className="section-page-content">
            <section className="dashboard-card estock-other-card">
              <div className="card-heading">
                <div>
                  <span className="ledger-kicker">E-STOCK / SAMPLE VIEW</span>
                  <h2>{sectionTitle}</h2>
                  <p>UI preview</p>
                </div>
                <span className="section-pill">SAMPLE</span>
              </div>
              <p className="section-preview">
                {sectionTitle} page layout will appear here. This menu is
                connected to the sample navigation only for now.
              </p>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
