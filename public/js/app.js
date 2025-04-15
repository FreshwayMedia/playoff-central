// Constants
const NHL_API_BASE_URL = 'https://statsapi.web.nhl.com/api/v1';
const UPDATE_INTERVAL = 60000; // 1 minute

// Scoring System
const SCORING_SYSTEM = {
    goal: 1,
    assist: 1,
    hit: 0.20,
    blocked: 0.20,
    goalieWin: 2,
    goalieSave: 0.03
};

// Team Limits
const TEAM_LIMITS = {
    forward: 6,
    defenseman: 4,
    goalie: 1
};

// State Management
let currentUser = null;
let currentPool = null;
let playerStats = new Map();
let availablePlayers = [];
let selectedPlayers = {
    forward: [],
    defenseman: [],
    goalie: []
};
let liveGames = new Map();
let playoffSeries = [];

// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Bootstrap components
    const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
    const playerSelectionModal = new bootstrap.Modal(document.getElementById('playerSelectionModal'));
    const poolCreationModal = new bootstrap.Modal(document.getElementById('poolCreationModal'));
    
    // Add event listeners
    document.getElementById('loginBtn').addEventListener('click', () => loginModal.show());
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('createPoolBtn').addEventListener('click', () => poolCreationModal.show());
    document.getElementById('selectPlayersBtn').addEventListener('click', () => {
        loadAvailablePlayers();
        playerSelectionModal.show();
    });
    
    // Player selection event listeners
    document.getElementById('playerSearch').addEventListener('input', filterPlayers);
    document.getElementById('positionFilter').addEventListener('change', filterPlayers);
    document.getElementById('saveTeamBtn').addEventListener('click', saveTeam);

    // Pool creation event listeners
    document.getElementById('poolCreationForm').addEventListener('submit', handlePoolCreation);
    document.getElementById('draftType').addEventListener('change', handleDraftTypeChange);
    setupPoolCreationValidation();

    // Initialize NHL data manager
    const nhlManager = new NHLDataManager();
    nhlManager.initialize();

    // Developer Login Functionality
    const devLoginBtn = document.getElementById('devLoginBtn');
    const devLoginModal = new bootstrap.Modal(document.getElementById('devLoginModal'));
    const devLoginForm = document.getElementById('devLoginForm');
    const devDashboard = document.getElementById('devDashboard');
    const devLogoutBtn = document.getElementById('devLogoutBtn');
    const mainContent = document.querySelector('main');

    // Developer credentials (in production, these should be handled securely on the backend)
    const DEV_CREDENTIALS = {
        username: 'FWplayoffcentral25',
        password: 'GOJetsGO'
    };

    // Show developer login modal
    devLoginBtn.addEventListener('click', () => {
        devLoginModal.show();
    });

    // Handle developer login
    devLoginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const username = document.getElementById('devUsername').value;
        const password = document.getElementById('devPassword').value;

        if (username === DEV_CREDENTIALS.username && password === DEV_CREDENTIALS.password) {
            // Success - show developer dashboard
            devLoginModal.hide();
            mainContent.classList.add('d-none');
            devDashboard.classList.remove('d-none');
            // Store dev login state
            sessionStorage.setItem('devLoggedIn', 'true');
        } else {
            // Failed login attempt
            alert('Invalid developer credentials. Access denied.');
        }

        // Clear form
        devLoginForm.reset();
    });

    // Handle developer logout
    devLogoutBtn.addEventListener('click', () => {
        mainContent.classList.remove('d-none');
        devDashboard.classList.add('d-none');
        sessionStorage.removeItem('devLoggedIn');
    });

    // Check for existing dev login session
    if (sessionStorage.getItem('devLoggedIn') === 'true') {
        mainContent.classList.add('d-none');
        devDashboard.classList.remove('d-none');
    }
});

// Authentication Functions
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        // Check for developer credentials
        if (email === 'FWplayoffcentral25' && password === 'GOJetsGO') {
            // Developer login successful
            currentUser = {
                email: email,
                id: 'dev_admin',
                name: 'Developer Admin',
                isDeveloper: true
            };
            
            // Hide welcome section and show developer dashboard
            document.getElementById('welcomeSection').classList.add('d-none');
            document.getElementById('dashboard').classList.add('d-none');
            document.getElementById('devDashboard').classList.remove('d-none');
            
            // Store developer session
            sessionStorage.setItem('devLoggedIn', 'true');
            
            // Close login modal
            const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
            loginModal.hide();
        } else {
            // Regular user login
            // TODO: Implement actual authentication
            simulateSuccessfulLogin(email);
        }
    } catch (error) {
        showError('Login failed. Please try again.');
    }
}

function simulateSuccessfulLogin(email) {
    currentUser = {
        email: email,
        id: 'user123',
        name: email.split('@')[0],
        isDeveloper: false
    };
    
    document.getElementById('welcomeSection').classList.add('d-none');
    document.getElementById('dashboard').classList.remove('d-none');
    document.getElementById('devDashboard').classList.add('d-none');
    loadUserPools();
}

// Pool Management
async function loadUserPools() {
    // TODO: Implement API call to get user's pools
    const mockPools = [
        { id: 'pool1', name: 'Stanley Cup 2024', members: 8 },
        { id: 'pool2', name: 'Office Pool', members: 12 }
    ];
    
    displayPools(mockPools);
}

function displayPools(pools) {
    const poolsList = document.getElementById('poolsList');
    poolsList.innerHTML = pools.map(pool => `
        <div class="pool-item" data-pool-id="${pool.id}">
            <h6>${pool.name}</h6>
            <small class="text-muted">${pool.members} members</small>
        </div>
    `).join('');
    
    // Add click handlers to pool items
    document.querySelectorAll('.pool-item').forEach(item => {
        item.addEventListener('click', () => loadPoolDetails(item.dataset.poolId));
    });
}

// NHL API Integration
async function fetchNHLData() {
    try {
        const response = await fetch(`${NHL_API_BASE_URL}/schedule?expand=team.stats`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching NHL data:', error);
        showError('Failed to fetch NHL data');
    }
}

async function fetchPlayerStats(playerId) {
    try {
        const response = await fetch(`${NHL_API_BASE_URL}/people/${playerId}/stats?stats=statsSingleSeason`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching player stats:', error);
        showError('Failed to fetch player statistics');
    }
}

// Pool Creation Functions
function setupPoolCreationValidation() {
    const form = document.getElementById('poolCreationForm');
    const rosterInputs = ['rosterForwards', 'rosterDefensemen', 'rosterGoalies'];
    const scoringInputs = ['goalPoints', 'assistPoints', 'goalieWinPoints'];
    
    // Add validation listeners
    rosterInputs.forEach(id => {
        const input = document.getElementById(id);
        input.addEventListener('change', validateRosterSizes);
    });

    scoringInputs.forEach(id => {
        const input = document.getElementById(id);
        input.addEventListener('change', validateScoringSettings);
    });
}

function validateRosterSizes() {
    const forwards = parseInt(document.getElementById('rosterForwards').value);
    const defensemen = parseInt(document.getElementById('rosterDefensemen').value);
    const goalies = parseInt(document.getElementById('rosterGoalies').value);
    
    const totalPlayers = forwards + defensemen + goalies;
    const maxMembers = parseInt(document.getElementById('maxMembers').value);
    
    if (totalPlayers * maxMembers > 150) { // Assuming max 150 playoff players
        showError('Total roster size across all teams exceeds available players');
        return false;
    }
    
    return true;
}

function validateScoringSettings() {
    const goalPoints = parseFloat(document.getElementById('goalPoints').value);
    const assistPoints = parseFloat(document.getElementById('assistPoints').value);
    const goalieWinPoints = parseFloat(document.getElementById('goalieWinPoints').value);
    
    if (goalPoints === 0 && assistPoints === 0 && goalieWinPoints === 0) {
        showError('At least one scoring category must have points assigned');
        return false;
    }
    
    return true;
}

function handleDraftTypeChange(event) {
    const draftType = event.target.value;
    const draftDateInput = document.getElementById('draftDate');
    
    if (draftType === 'snake' || draftType === 'auction') {
        draftDateInput.required = true;
        draftDateInput.parentElement.style.display = 'block';
    } else {
        draftDateInput.required = false;
        draftDateInput.parentElement.style.display = 'none';
    }
}

async function handlePoolCreation(event) {
    event.preventDefault();
    
    if (!validateRosterSizes() || !validateScoringSettings()) {
        return;
    }
    
    const formData = {
        name: document.getElementById('poolName').value,
        maxMembers: parseInt(document.getElementById('maxMembers').value),
        roster: {
            forwards: parseInt(document.getElementById('rosterForwards').value),
            defensemen: parseInt(document.getElementById('rosterDefensemen').value),
            goalies: parseInt(document.getElementById('rosterGoalies').value)
        },
        scoring: {
            goalPoints: parseFloat(document.getElementById('goalPoints').value),
            assistPoints: parseFloat(document.getElementById('assistPoints').value),
            goalieWinPoints: parseFloat(document.getElementById('goalieWinPoints').value)
        },
        draft: {
            type: document.getElementById('draftType').value,
            date: document.getElementById('draftDate').value || null
        },
        settings: {
            allowTrading: document.getElementById('allowTrading').checked,
            publicPool: document.getElementById('publicPool').checked,
            autoPickEnabled: document.getElementById('autoPickEnabled').checked
        },
        invites: document.getElementById('inviteEmails').value
            .split('\n')
            .map(email => email.trim())
            .filter(email => email.length > 0)
    };

    try {
        // TODO: Send to backend
        console.log('Creating pool with settings:', formData);
        
        // For now, simulate success
        const poolId = 'pool_' + Date.now();
        await createPool(formData, poolId);
        
        // Close modal and show success
        const modal = bootstrap.Modal.getInstance(document.getElementById('poolCreationModal'));
        modal.hide();
        
        showSuccess('Pool created successfully! Invitations have been sent.');
        loadUserPools(); // Refresh the pools list
    } catch (error) {
        showError('Failed to create pool. Please try again.');
    }
}

async function createPool(settings, poolId) {
    // TODO: Replace with actual API call
    const pool = {
        id: poolId,
        ...settings,
        commissioner: currentUser.id,
        members: [currentUser.id],
        created: new Date().toISOString(),
        status: 'pending' // pending, active, completed
    };
    
    // Simulate storing the pool
    if (!window.pools) window.pools = new Map();
    window.pools.set(poolId, pool);
    
    // Simulate sending invites
    if (settings.invites.length > 0) {
        console.log('Sending invites to:', settings.invites);
    }
    
    return pool;
}

function showSuccess(message) {
    // TODO: Implement better success messaging
    alert(message);
}

// Player Selection Functions
async function loadAvailablePlayers() {
    try {
        // In a real application, this would fetch from your backend
        // For now, we'll use mock data
        availablePlayers = [
            { id: 1, name: 'Connor McDavid', team: 'Edmonton Oilers', position: 'forward', stats: { goals: 64, assists: 89 } },
            { id: 2, name: 'Leon Draisaitl', team: 'Edmonton Oilers', position: 'forward', stats: { goals: 52, assists: 76 } },
            { id: 3, name: 'Nathan MacKinnon', team: 'Colorado Avalanche', position: 'forward', stats: { goals: 51, assists: 89 } },
            { id: 4, name: 'Cale Makar', team: 'Colorado Avalanche', position: 'defenseman', stats: { goals: 17, assists: 49 } },
            { id: 5, name: 'Roman Josi', team: 'Nashville Predators', position: 'defenseman', stats: { goals: 18, assists: 41 } },
            { id: 6, name: 'Andrei Vasilevskiy', team: 'Tampa Bay Lightning', position: 'goalie', stats: { wins: 34, shutouts: 4 } },
            { id: 7, name: 'Igor Shesterkin', team: 'New York Rangers', position: 'goalie', stats: { wins: 37, shutouts: 3 } },
            // Add more players as needed
        ];
        
        displayAvailablePlayers(availablePlayers);
        updatePlayerCounts();
    } catch (error) {
        console.error('Error loading players:', error);
        showError('Failed to load available players');
    }
}

function displayAvailablePlayers(players) {
    const container = document.getElementById('availablePlayers');
    container.innerHTML = players.map(player => `
        <div class="player-item ${isPlayerSelected(player) ? 'selected' : ''}" data-player-id="${player.id}">
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <div class="player-name">${player.name}</div>
                    <div class="player-team">${player.team}</div>
                </div>
                <span class="player-position">${player.position.toUpperCase()}</span>
            </div>
            <div class="player-stats">
                ${formatPlayerStats(player)}
            </div>
            <div class="playoff-stats text-muted">
                Playoff Stats: ${formatPlayoffStats(player)}
            </div>
        </div>
    `).join('');

    // Add click handlers
    container.querySelectorAll('.player-item').forEach(item => {
        item.addEventListener('click', () => togglePlayerSelection(item.dataset.playerId));
    });
}

function formatPlayerStats(player) {
    if (player.position === 'goalie') {
        return `Wins: ${player.stats.wins || 0} | Saves: ${player.stats.saves || 0}`;
    }
    return `G: ${player.stats.goals || 0} | A: ${player.stats.assists || 0} | HIT: ${player.stats.hits || 0} | BLK: ${player.stats.blocked || 0}`;
}

function formatPlayoffStats(player) {
    const points = calculatePlayerPoints(player);
    if (player.position === 'goalie') {
        return `Points: ${points} (W: ${player.stats.wins || 0}, SV: ${player.stats.saves || 0})`;
    }
    return `Points: ${points} (G: ${player.stats.goals || 0}, A: ${player.stats.assists || 0}, HIT: ${player.stats.hits || 0}, BLK: ${player.stats.blocked || 0})`;
}

function filterPlayers() {
    const searchTerm = document.getElementById('playerSearch').value.toLowerCase();
    const positionFilter = document.getElementById('positionFilter').value;
    
    const filtered = availablePlayers.filter(player => {
        const matchesSearch = player.name.toLowerCase().includes(searchTerm) ||
                            player.team.toLowerCase().includes(searchTerm);
        const matchesPosition = positionFilter === 'all' || player.position === positionFilter;
        return matchesSearch && matchesPosition;
    });
    
    displayAvailablePlayers(filtered);
}

function validateTeamSelection() {
    return selectedPlayers.forward.length === TEAM_LIMITS.forward &&
           selectedPlayers.defenseman.length === TEAM_LIMITS.defenseman &&
           selectedPlayers.goalie.length === TEAM_LIMITS.goalie;
}

function togglePlayerSelection(playerId) {
    const player = availablePlayers.find(p => p.id === parseInt(playerId));
    if (!player) return;

    const positionArray = selectedPlayers[player.position];
    const isCurrentlySelected = positionArray.some(p => p.id === player.id);
    
    if (isCurrentlySelected) {
        // Remove player
        const index = positionArray.findIndex(p => p.id === player.id);
        positionArray.splice(index, 1);
    } else {
        // Add player if under limit
        if (positionArray.length < TEAM_LIMITS[player.position]) {
            positionArray.push(player);
        } else {
            showError(`You can only select ${TEAM_LIMITS[player.position]} ${player.position}${player.position !== 'goalie' ? 's' : ''}`);
            return;
        }
    }
    
    updatePlayerCounts();
    displayAvailablePlayers(availablePlayers);
    displaySelectedPlayers();
}

function displaySelectedPlayers() {
    const container = document.getElementById('selectedPlayers');
    const allSelected = [
        ...selectedPlayers.forward,
        ...selectedPlayers.defenseman,
        ...selectedPlayers.goalie
    ];
    
    container.innerHTML = allSelected.map(player => `
        <div class="player-item selected" data-player-id="${player.id}">
            <div class="d-flex justify-content-between align-items-start">
                <div class="player-name">${player.name}</div>
                <span class="player-position">${player.position.toUpperCase()}</span>
            </div>
        </div>
    `).join('');
}

function updatePlayerCounts() {
    document.getElementById('forwardCount').textContent = selectedPlayers.forward.length;
    document.getElementById('defenseCount').textContent = selectedPlayers.defenseman.length;
    document.getElementById('goalieCount').textContent = selectedPlayers.goalie.length;
}

function isPlayerSelected(player) {
    return selectedPlayers[player.position].some(p => p.id === player.id);
}

function saveTeam() {
    // TODO: Implement saving team to backend
    const totalSelected = Object.values(selectedPlayers).reduce((sum, arr) => sum + arr.length, 0);
    const totalRequired = Object.values(TEAM_LIMITS).reduce((sum, limit) => sum + limit, 0);
    
    if (totalSelected < totalRequired) {
        showError('Please select all required players before saving');
        return;
    }
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('playerSelectionModal'));
    modal.hide();
    
    // Show success message
    alert('Team saved successfully!');
    // TODO: Update standings with new team
}

// Utility Functions
function showError(message) {
    // TODO: Implement better error handling
    alert(message);
}

// Live Updates
function initializeLiveUpdates() {
    // Poll for updates every minute
    setInterval(async () => {
        if (currentPool) {
            await updatePoolStats();
        }
    }, 60000);
}

async function updatePoolStats() {
    if (!currentPool) return;

    const standings = document.getElementById('standings');
    if (!standings) return;

    // Calculate total points for each team
    const teamPoints = Array.from(currentPool.teams || []).map(team => {
        const totalPoints = team.players.reduce((sum, player) => {
            return sum + calculatePlayerPoints(player);
        }, 0);

        return {
            name: team.name,
            points: Number(totalPoints.toFixed(2))
        };
    });

    // Sort by points
    teamPoints.sort((a, b) => b.points - a.points);

    // Update standings display
    standings.innerHTML = `
        <table class="table standings-table">
            <thead>
                <tr>
                    <th>Rank</th>
                    <th>Team</th>
                    <th>Points</th>
                </tr>
            </thead>
            <tbody>
                ${teamPoints.map((team, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${team.name}</td>
                        <td>${team.points}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// NHL Data Integration
class NHLDataManager {
    constructor() {
        this.isPlayoffs = false;
        this.activeGames = new Map();
        this.playerCache = new Map();
        this.teamCache = new Map();
        this.currentRound = '';
        this.tickerElement = null;
    }

    async initialize() {
        try {
            this.tickerElement = document.getElementById('tickerWrapper');
            await this.updateSeasonState();
            await this.updatePlayoffData();
            await this.startLiveUpdates();
            this.initializeTickerDuplication();
        } catch (error) {
            console.error('Failed to initialize NHL data:', error);
            showError('Failed to load NHL data. Please refresh the page.');
        }
    }

    async updateSeasonState() {
        const response = await fetch(`${NHL_API_BASE_URL}/seasons/current`);
        const data = await response.json();
        const currentSeason = data.seasons[0];
        this.isPlayoffs = currentSeason.regularSeasonEndDate < new Date().toISOString();
    }

    async updatePlayoffData() {
        if (!this.isPlayoffs) {
            console.log('Regular season is still in progress');
            return;
        }

        const response = await fetch(`${NHL_API_BASE_URL}/tournaments/playoffs?expand=round.series,schedule.game.seriesSummary`);
        const data = await response.json();
        playoffSeries = data.rounds || [];
        
        // Update current round
        const currentRound = playoffSeries.find(round => round.number === data.currentRound);
        this.currentRound = currentRound ? currentRound.names.name : 'NHL Playoffs';
        document.querySelector('.playoff-round').textContent = this.currentRound.toUpperCase();
        
        // Update available players based on playoff teams
        await this.updatePlayoffPlayers();
    }

    async updatePlayoffPlayers() {
        const playoffTeamIds = new Set();
        playoffSeries.forEach(round => {
            round.series.forEach(series => {
                playoffTeamIds.add(series.team1Id);
                playoffTeamIds.add(series.team2Id);
            });
        });

        const players = [];
        for (const teamId of playoffTeamIds) {
            const roster = await this.fetchTeamRoster(teamId);
            players.push(...roster);
        }

        availablePlayers = players;
        this.updatePlayerStats();
    }

    async fetchTeamRoster(teamId) {
        const response = await fetch(`${NHL_API_BASE_URL}/teams/${teamId}/roster?expand=roster.stats`);
        const data = await response.json();
        const team = await this.getTeamInfo(teamId);

        return data.roster.map(player => ({
            id: player.person.id,
            name: player.person.fullName,
            team: team.name,
            position: this.normalizePosition(player.position.code),
            stats: { goals: 0, assists: 0, wins: 0, shutouts: 0 } // Will be updated with live stats
        }));
    }

    async getTeamInfo(teamId) {
        if (this.teamCache.has(teamId)) {
            return this.teamCache.get(teamId);
        }

        const response = await fetch(`${NHL_API_BASE_URL}/teams/${teamId}`);
        const data = await response.json();
        const team = data.teams[0];
        this.teamCache.set(teamId, team);
        return team;
    }

    normalizePosition(positionCode) {
        const positionMap = {
            'C': 'forward',
            'L': 'forward',
            'R': 'forward',
            'D': 'defenseman',
            'G': 'goalie'
        };
        return positionMap[positionCode] || positionCode.toLowerCase();
    }

    async updatePlayerStats() {
        const statsPromises = availablePlayers.map(player => 
            this.fetchPlayerPlayoffStats(player.id)
        );

        const stats = await Promise.all(statsPromises);
        stats.forEach((playerStats, index) => {
            if (playerStats) {
                availablePlayers[index].stats = playerStats;
            }
        });

        this.updateUI();
    }

    async fetchPlayerPlayoffStats(playerId) {
        try {
            const response = await fetch(
                `${NHL_API_BASE_URL}/people/${playerId}/stats?stats=statsSingleSeasonPlayoffs`
            );
            const data = await response.json();
            const stats = data.stats[0]?.splits[0]?.stat || null;

            if (!stats) return null;

            return {
                goals: stats.goals || 0,
                assists: stats.assists || 0,
                hits: stats.hits || 0,
                blocked: stats.blocked || 0,
                wins: stats.wins || 0,
                saves: stats.saves || 0
            };
        } catch (error) {
            console.error(`Failed to fetch stats for player ${playerId}:`, error);
            return null;
        }
    }

    async startLiveUpdates() {
        // Initial update
        await this.updateLiveGames();

        // Set up periodic updates
        setInterval(async () => {
            await this.updateLiveGames();
            await this.updatePlayerStats();
        }, UPDATE_INTERVAL);
    }

    async updateLiveGames() {
        try {
            const response = await fetch(
                `${NHL_API_BASE_URL}/schedule?expand=schedule.linescore,schedule.scoringplays,schedule.game.seriesSummary`
            );
            const data = await response.json();
            const games = data.dates[0]?.games || [];

            // Update live games map
            this.activeGames.clear();
            games.forEach(game => {
                if (game.status.abstractGameState === 'Live' || game.status.abstractGameState === 'Final') {
                    this.activeGames.set(game.gamePk, game);
                    this.processGameEvents(game);
                }
            });

            this.updateLiveScores();
            this.updateScoresTicker();
        } catch (error) {
            console.error('Failed to update live games:', error);
        }
    }

    processGameEvents(game) {
        const scoringPlays = game.scoringPlays || [];
        scoringPlays.forEach(play => {
            const scorer = play.players.find(p => p.playerType === 'Scorer');
            const assists = play.players.filter(p => p.playerType === 'Assist');

            if (scorer) {
                this.updatePlayerStat(scorer.player.id, 'goals', 1);
            }
            assists.forEach(assist => {
                this.updatePlayerStat(assist.player.id, 'assists', 1);
            });
        });

        // Update goalie stats if game is finished
        if (game.status.abstractGameState === 'Final') {
            this.updateGoalieStats(game);
        }
    }

    updatePlayerStat(playerId, stat, value) {
        const player = availablePlayers.find(p => p.id === playerId);
        if (player) {
            player.stats[stat] = (player.stats[stat] || 0) + value;
        }
    }

    updateGoalieStats(game) {
        const winningTeam = game.teams.home.score > game.teams.away.score ? 'home' : 'away';
        const winningGoalie = game.linescore?.teams[winningTeam]?.goalie;
        
        if (winningGoalie) {
            this.updatePlayerStat(winningGoalie.id, 'wins', 1);
            
            // Check for shutout
            const losingTeam = winningTeam === 'home' ? 'away' : 'home';
            if (game.teams[losingTeam].score === 0) {
                this.updatePlayerStat(winningGoalie.id, 'shutouts', 1);
            }
        }
    }

    updateLiveScores() {
        const liveScoresContainer = document.getElementById('liveScores');
        if (!liveScoresContainer) return;

        const gamesHtml = Array.from(this.activeGames.values()).map(game => `
            <div class="live-game">
                <div class="team-score">
                    <span class="team">${game.teams.away.team.name}</span>
                    <span class="score">${game.teams.away.score}</span>
                </div>
                <div class="game-status">${game.linescore.currentPeriodOrdinal}</div>
                <div class="team-score">
                    <span class="team">${game.teams.home.team.name}</span>
                    <span class="score">${game.teams.home.score}</span>
                </div>
            </div>
        `).join('');

        liveScoresContainer.innerHTML = gamesHtml || '<p>No live games at the moment</p>';
    }

    updateScoresTicker() {
        if (!this.tickerElement) return;

        const games = Array.from(this.activeGames.values());
        if (games.length === 0) {
            this.tickerElement.innerHTML = '<div class="ticker-game">No games currently in progress</div>';
            return;
        }

        const tickerContent = games.map(game => {
            const awayTeam = game.teams.away;
            const homeTeam = game.teams.home;
            const seriesSummary = game.seriesSummary || {};
            const period = game.linescore.currentPeriodOrdinal || '';
            const timeRemaining = game.linescore.currentPeriodTimeRemaining || '';
            const gameState = game.status.abstractGameState === 'Final' ? 'Final' : `${period} ${timeRemaining}`;

            return `
                <div class="ticker-game">
                    <div class="ticker-team">
                        <img src="https://www-league.nhlstatic.com/images/logos/teams-current-primary-light/${awayTeam.team.id}.svg" 
                             class="team-logo" alt="${awayTeam.team.name}">
                        <span>${awayTeam.team.abbreviation}</span>
                        <span class="ticker-score">${awayTeam.score}</span>
                    </div>
                    <div class="ticker-status">${gameState}</div>
                    <div class="ticker-team">
                        <img src="https://www-league.nhlstatic.com/images/logos/teams-current-primary-light/${homeTeam.team.id}.svg" 
                             class="team-logo" alt="${homeTeam.team.name}">
                        <span>${homeTeam.team.abbreviation}</span>
                        <span class="ticker-score">${homeTeam.score}</span>
                    </div>
                    ${seriesSummary.seriesStatus ? 
                        `<div class="ticker-series">${seriesSummary.seriesStatus}</div>` : 
                        ''}
                </div>
            `;
        }).join('');

        // Duplicate the content for smooth infinite scrolling
        this.tickerElement.innerHTML = tickerContent + tickerContent + tickerContent;
    }

    initializeTickerDuplication() {
        if (!this.tickerElement) return;

        // Reset animation when it completes
        this.tickerElement.addEventListener('animationend', () => {
            this.tickerElement.style.animation = 'none';
            this.tickerElement.offsetHeight; // Trigger reflow
            this.tickerElement.style.animation = null;
        });
    }

    updateUI() {
        // Update player selection interface
        if (document.getElementById('availablePlayers')) {
            displayAvailablePlayers(availablePlayers);
        }

        // Update standings if in a pool
        if (currentPool) {
            updatePoolStats();
        }
    }
}

// Initialize NHL data manager
const nhlManager = new NHLDataManager();
document.addEventListener('DOMContentLoaded', () => {
    nhlManager.initialize();
});

// Update the scoring calculation
function calculatePlayerPoints(player) {
    const stats = player.stats;
    let points = 0;

    if (player.position === 'goalie') {
        points += (stats.wins || 0) * SCORING_SYSTEM.goalieWin;
        points += (stats.saves || 0) * SCORING_SYSTEM.goalieSave;
    } else {
        points += (stats.goals || 0) * SCORING_SYSTEM.goal;
        points += (stats.assists || 0) * SCORING_SYSTEM.assist;
        points += (stats.hits || 0) * SCORING_SYSTEM.hit;
        points += (stats.blocked || 0) * SCORING_SYSTEM.blocked;
    }

    return Number(points.toFixed(2));
} 