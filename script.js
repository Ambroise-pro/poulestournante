class VolleyballManager {
  constructor() {
    this.players = [];
    this.matches = [];
    this.scores = new Map();
    this.settings = {
      victoryPoints: 3,
      drawPoints: 1,
      bonusThreshold: 5,
      bonusPoints: 1
    };
    
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    document.getElementById('addPlayer').addEventListener('click', () => this.addPlayer());
    document.getElementById('generateMatches').addEventListener('click', () => this.generateMatches());
    document.getElementById('playerName').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addPlayer();
    });

    // Modal event listeners
    document.getElementById('settingsButton').addEventListener('click', () => this.openSettings());
    document.getElementById('closeSettings').addEventListener('click', () => this.closeSettings());
    document.getElementById('saveSettings').addEventListener('click', () => this.saveSettings());
  }

  openSettings() {
    const modal = document.getElementById('settingsModal');
    document.getElementById('victoryPoints').value = this.settings.victoryPoints;
    document.getElementById('drawPoints').value = this.settings.drawPoints;
    document.getElementById('bonusThreshold').value = this.settings.bonusThreshold;
    document.getElementById('bonusPoints').value = this.settings.bonusPoints;
    modal.classList.add('show');
  }

  closeSettings() {
    document.getElementById('settingsModal').classList.remove('show');
  }

  saveSettings() {
    this.settings = {
      victoryPoints: parseInt(document.getElementById('victoryPoints').value),
      drawPoints: parseInt(document.getElementById('drawPoints').value),
      bonusThreshold: parseInt(document.getElementById('bonusThreshold').value),
      bonusPoints: parseInt(document.getElementById('bonusPoints').value)
    };
    this.closeSettings();
    this.recalculateAllScores();
  }

  recalculateAllScores() {
    // Recalculer tous les scores avec les nouveaux paramètres
    this.calculatePlayerScores();
    this.renderScores();
    // Mettre à jour l'affichage des points pour chaque match
    this.matches.forEach((_, index) => {
      this.updateMatchPoints(index);
    });
  }

  addPlayer() {
    const input = document.getElementById('playerName');
    const name = input.value.trim();
    
    if (name && this.players.length < 6) {
      this.players.push(name);
      this.scores.set(name, 0);
      this.updatePlayersList();
      input.value = '';
    }
    
    document.getElementById('generateMatches').disabled = this.players.length !== 6;
  }

  updatePlayersList() {
    const list = document.getElementById('playersList');
    list.innerHTML = this.players.map(player => `
      <li>
        ${player}
        <button onclick="volleyballManager.removePlayer('${player}')">❌</button>
      </li>
    `).join('');
  }

  removePlayer(player) {
    this.players = this.players.filter(p => p !== player);
    this.scores.delete(player);
    this.updatePlayersList();
    document.getElementById('generateMatches').disabled = this.players.length !== 6;
  }

  generateMatches() {
    this.matches = this.generateTeamCombinations();
    this.renderMatches();
  }

  generateTeamCombinations() {
    const matches = [];
    const players = [...this.players];
    
    // Générer toutes les combinaisons possibles de 3 joueurs
    for (let i = 0; i < players.length - 2; i++) {
      for (let j = i + 1; j < players.length - 1; j++) {
        for (let k = j + 1; k < players.length; k++) {
          const team1 = [players[i], players[j], players[k]];
          const team2 = players.filter(p => !team1.includes(p));
          matches.push({ team1, team2, score1: 0, score2: 0 });
        }
      }
    }

    // Sélectionner aléatoirement 6 matchs uniques
    return this.shuffleArray(matches).slice(0, 6);
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  renderMatches() {
    const matchesList = document.getElementById('matchesList');
    matchesList.innerHTML = this.matches.map((match, index) => `
      <div class="match-card">
        <h3>Match ${index + 1}</h3>
        <div class="match-teams">
          <div class="team">
            <h3>Équipe 1</h3>
            <ul>
              ${match.team1.map(player => `<li>${player}</li>`).join('')}
            </ul>
          </div>
          <div class="team">
            <h3>Équipe 2</h3>
            <ul>
              ${match.team2.map(player => `<li>${player}</li>`).join('')}
            </ul>
          </div>
        </div>
        <div class="score-input">
          <input type="number" min="0" value="${match.score1}" 
                 onchange="volleyballManager.updateScore(${index}, 1, this.value)">
          <span>-</span>
          <input type="number" min="0" value="${match.score2}"
                 onchange="volleyballManager.updateScore(${index}, 2, this.value)">
        </div>
        <div class="match-points"></div>
      </div>
    `).join('');
  }

  updateScore(matchIndex, team, score) {
    const match = this.matches[matchIndex];
    if (team === 1) {
      match.score1 = parseInt(score);
    } else {
      match.score2 = parseInt(score);
    }
    
    this.calculatePlayerScores();
    this.renderScores();
    this.updateMatchPoints(matchIndex);
  }

  updateMatchPoints(matchIndex) {
    const match = this.matches[matchIndex];
    const matchCard = document.querySelectorAll('.match-card')[matchIndex];
    const pointsDiv = matchCard.querySelector('.match-points');
    
    let team1Points = 0;
    let team2Points = 0;
    
    // Calcul des points selon les paramètres
    if (match.score1 > match.score2) {
      team1Points = this.settings.victoryPoints;
      team1Points += Math.floor((match.score1 - match.score2) / this.settings.bonusThreshold) * this.settings.bonusPoints;
    } else if (match.score2 > match.score1) {
      team2Points = this.settings.victoryPoints;
      team2Points += Math.floor((match.score2 - match.score1) / this.settings.bonusThreshold) * this.settings.bonusPoints;
    } else if (match.score1 === match.score2 && match.score1 > 0) {
      team1Points = this.settings.drawPoints;
      team2Points = this.settings.drawPoints;
    }
    
    pointsDiv.innerHTML = `
      <p class="points-info">
        Points : Équipe 1 (${team1Points} pts) - Équipe 2 (${team2Points} pts)
      </p>
    `;
  }

  calculatePlayerScores() {
    // Réinitialiser les scores
    for (let player of this.players) {
      this.scores.set(player, 0);
    }

    // Calculer les nouveaux scores
    for (let match of this.matches) {
      let team1Points = 0;
      let team2Points = 0;
      
      // Points selon les paramètres
      if (match.score1 > match.score2) {
        team1Points = this.settings.victoryPoints;
        team1Points += Math.floor((match.score1 - match.score2) / this.settings.bonusThreshold) * this.settings.bonusPoints;
      } else if (match.score2 > match.score1) {
        team2Points = this.settings.victoryPoints;
        team2Points += Math.floor((match.score2 - match.score1) / this.settings.bonusThreshold) * this.settings.bonusPoints;
      } else if (match.score1 === match.score2 && match.score1 > 0) {
        team1Points = this.settings.drawPoints;
        team2Points = this.settings.drawPoints;
      }
      
      // Attribuer les points aux joueurs
      for (let player of match.team1) {
        this.scores.set(player, this.scores.get(player) + team1Points);
      }
      for (let player of match.team2) {
        this.scores.set(player, this.scores.get(player) + team2Points);
      }
    }
  }

  renderScores() {
    const scoresList = document.getElementById('scoresList');
    const sortedScores = [...this.scores.entries()]
      .sort((a, b) => b[1] - a[1]);

    scoresList.innerHTML = sortedScores.map(([player, score]) => `
      <div class="score-item">
        <span>${player}</span>
        <span>${score} points</span>
      </div>
    `).join('');
  }
}

// Initialiser le gestionnaire
window.volleyballManager = new VolleyballManager();