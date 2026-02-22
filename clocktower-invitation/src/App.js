
import React, { useState, useEffect } from 'react';
import './App.css';
import FoldedInvitation from './components/FoldedInvitation';
import UnfoldedInvitation from './components/UnfoldedInvitation';
import inviteImg from './img/invite_img.jpg';

function App() {
  const [isUnfolded, setIsUnfolded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = inviteImg;
  }, []);

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
