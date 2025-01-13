export const tagList: string[] = [
	'Circuit Seductress',
	'Binary Bondage',
	'Mecha Masochist',
	'Neon Noir Lover',
	'Robo-Submissive',
	'Cyber-Domme',
	'Holo-Heartbreaker',
	'Chrome Fetishist',
	'Algorithmic Admirer',
	'Electric Tease',
	'AI Voyeur',
	'Transhuman Temptress',
	'Synthetic Sensualist',
	'Neural Link Lover',
	'Code Craver',
	'Techno Temptation',
	'Quantum Kinkster',
	'Firmware Flirt',
	'Augmentation Arousal',
	'Digital Deviant'
];

export type fameStats = {
	average_views: number;
	average_likes: number;
	average_match: number;
	standart_dev_views: number;
	standart_dev_likes: number;
	standart_dev_match: number;
};

export const averages = {
	average_views: 0.5,
	average_likes: 0.201980198019802,
	average_match: 0.03762376237623762,
	standart_dev_views: 0.5000000000000001,
	standart_dev_likes: 0.5000000000000001,
	standart_dev_match: 0.5000000000000001
};

export const fameRatingWeights = {
	views: 0.2,
	likes: 0.3,
	match: 0.5
};

export const scoreWeights = {
	fameRating: 0.3,
	tags: 0.3,
	distance: 0.6
};

export type BrowsingInfo = {
	id: string;
	userName: string;
	biography: string;
	gender: string;
	fameRate: number;
	age: number;
	localisation: number;
	longitude: number;
	latitude: number;
	score: number;
	sexualPreferences: string;
	mask: boolean;
	tags: string[];
};

export type CommonTagStats = {
	commonTag: number;
	ntagsUser1: number;
	ntagsUser2: number;
};
