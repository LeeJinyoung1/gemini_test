
import React, { useState } from 'react';
import './App.css';
import FoldedInvitation from './components/FoldedInvitation';
import UnfoldedInvitation from './components/UnfoldedInvitation';

function App() {
  const [isUnfolded, setIsUnfolded] = useState(false);

  const handleUnfold = () => {
    setIsUnfolded(true);
  };

  return (
    <div className="App">
      <header className="App-header">
        {isUnfolded ? (
          <UnfoldedInvitation />
        ) : (
          <FoldedInvitation onUnfold={handleUnfold} />
        )}
      </header>
    </div>
  );
}

export default App;
