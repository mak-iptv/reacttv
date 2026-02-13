// components/Sidebar.jsx
import React from 'react';

function Sidebar({ 
  categories = [], 
  selectedCategory, 
  onSelectCategory,
  isOpen,
  onToggle,
  stats = {}
}) {
  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <h3>Kategoritë</h3>
        <button className="sidebar-toggle" onClick={onToggle}>
          {isOpen ? '◀' : '▶'}
        </button>
      </div>
      
      {isOpen && (
        <>
          <ul className="category-list">
            {categories.map((category) => (
              <li 
                key={category}
                className={`category-item ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => onSelectCategory(category)}
              >
                <span className="category-icon">
                  {category === 'Të gjitha' ? '🏠' : '📺'}
                </span>
                <span className="category-name">
                  {category === 'Të gjitha' ? 'Të gjitha' : category}
                </span>
                {selectedCategory === category && (
                  <span className="check-icon">✓</span>
                )}
              </li>
            ))}
          </ul>
          
          <div className="sidebar-footer">
            <div className="stats">
              {Object.entries(stats).map(([key, value]) => (
                <p key={key}>{key}: {value}</p>
              ))}
            </div>
          </div>
        </>
      )}
    </aside>
  );
}

export default Sidebar;