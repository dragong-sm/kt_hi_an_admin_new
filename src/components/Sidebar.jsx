import { Link, useRouter } from '../router';
import { STORE_ID, STORE_NAME } from '../api/config';
import Logo from './Logo';
import Icon from './Icon';

const NAV = [
  { to: '/inventory', label: '재고 관리', icon: 'box', match: ['/', '/inventory'] },
  { to: '/reviews', label: '리뷰 관리', icon: 'message', match: ['/reviews'] },
];

export default function Sidebar() {
  const { path } = useRouter();
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Link to="/inventory" className="sidebar-logo">
          <Logo height={30} />
        </Link>
        <p className="sidebar-tagline">사장님 AI Agent</p>
      </div>

      <nav className="sidebar-nav" aria-label="관리 메뉴">
        {NAV.map((item) => {
          const active = item.match.includes(path);
          return (
            <Link key={item.to} to={item.to} className={`nav-item${active ? ' is-active' : ''}`} aria-current={active ? 'page' : undefined}>
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-store">
        <div className="store-icon">
          <Icon name="store" size={16} />
        </div>
        <div className="store-text">
          <strong>{STORE_NAME}</strong>
          <span className="store-meta">{STORE_ID}</span>
        </div>
      </div>
    </aside>
  );
}
