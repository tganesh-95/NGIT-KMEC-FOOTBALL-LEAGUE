export const teams = [
  ['ngit-1', 'NGIT 1st Years', 'NGIT', '1st'],
  ['ngit-2', 'NGIT 2nd Years', 'NGIT', '2nd'],
  ['ngit-3', 'NGIT 3rd Years', 'NGIT', '3rd'],
  ['kmec-1', 'KMEC 1st Years', 'KMEC', '1st'],
  ['kmec-2', 'KMEC 2nd Years', 'KMEC', '2nd'],
  ['kmec-3', 'KMEC 3rd Years', 'KMEC', '3rd'],
  ['kmec-4', 'KMEC 4th Years', 'KMEC', '4th']
].map(([teamId, name, institution, year]) => ({ teamId, name, institution, year }));

const fixtures = [
  ['NGIT 3rd Years', 'KMEC 3rd Years'], ['NGIT 2nd Years', 'KMEC 4th Years'], ['KMEC 1st Years', 'KMEC 2nd Years'],
  ['NGIT 1st Years', 'KMEC 4th Years'], ['NGIT 2nd Years', 'KMEC 2nd Years'], ['NGIT 3rd Years', 'KMEC 1st Years'],
  ['KMEC 4th Years', 'KMEC 2nd Years'], ['NGIT 1st Years', 'KMEC 3rd Years'], ['NGIT 2nd Years', 'NGIT 3rd Years'],
  ['NGIT 1st Years', 'KMEC 2nd Years'], ['KMEC 3rd Years', 'KMEC 1st Years'], ['KMEC 4th Years', 'NGIT 3rd Years'],
  ['KMEC 3rd Years', 'NGIT 2nd Years'], ['NGIT 1st Years', 'KMEC 1st Years'], ['KMEC 2nd Years', 'NGIT 3rd Years'],
  ['KMEC 3rd Years', 'KMEC 4th Years'], ['NGIT 1st Years', 'NGIT 3rd Years'], ['KMEC 1st Years', 'NGIT 2nd Years'],
  ['KMEC 2nd Years', 'KMEC 3rd Years'], ['NGIT 1st Years', 'NGIT 2nd Years'], ['KMEC 1st Years', 'KMEC 4th Years']
];

export const fixtureDocuments = fixtures.map(([team1, team2], index) => ({
  matchNumber: index + 1, team1, team2, status: 'Scheduled', date: '', time: '', venue: '', team1Score: null, team2Score: null
}));
