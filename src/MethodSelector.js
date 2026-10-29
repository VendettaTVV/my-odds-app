import React from 'react';

function MethodSelector({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'poisson', label: 'Poisson Distribution' },
    { id: 'elo', label: 'ELO Rating System' },
    { id: 'formulas', label: 'Methodology (Docs)' }
  ];

  return (
    <nav className="flex space-x-2 bg-gray-950 p-1 rounded-lg border border-gray-700">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
            activeTab === tab.id
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

export default MethodSelector;