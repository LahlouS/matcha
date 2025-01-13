import type { ReducedProfileInfo } from '$lib/domain/browse';

interface SortingCriteria {
	id: string;
	age: number;
	fameRate: number;
	localisation: number;
	mask: boolean;
}

interface AgeCriteria {
	range: [number, number];
	order: 'ascendant' | 'descendant' | 'none';
}

interface FameCriteria {
	range: [number, number];
	order: 'ascendant' | 'descendant' | 'none';
}

interface LocalisationCriteria {
	order: 'closest' | 'none';
	country: string;
}

export interface SortingInfo {
	age: AgeCriteria;
	fameRate: FameCriteria;
	localisation: LocalisationCriteria;
	tags: string[];
}

function sortByAge(
	array: SortingCriteria[] | ReducedProfileInfo[],
	order: 'ascendant' | 'descendant' | 'none'
) {
	if (order == 'ascendant') {
		const compare = (
			a: SortingCriteria | ReducedProfileInfo,
			b: SortingCriteria | ReducedProfileInfo
		) => {
			return a.age - b.age; // Sort by age in ascending order
		};
		array.sort(compare);
	} else if (order == 'descendant') {
		const compare = (
			a: SortingCriteria | ReducedProfileInfo,
			b: SortingCriteria | ReducedProfileInfo
		) => {
			return b.age - a.age; // Sort by age in ascending order
		};
		array.sort(compare);
	}
	return array;
}

function sortByfameRate(
	array: SortingCriteria[] | ReducedProfileInfo[],
	order: 'ascendant' | 'descendant' | 'none'
) {
	if (order == 'ascendant') {
		const compare = (
			a: SortingCriteria | ReducedProfileInfo,
			b: SortingCriteria | ReducedProfileInfo
		) => {
			return a.fameRate - b.fameRate; // Sort by age in ascending order
		};
		array.sort(compare);
	} else if (order == 'descendant') {
		const compare = (
			a: SortingCriteria | ReducedProfileInfo,
			b: SortingCriteria | ReducedProfileInfo
		) => {
			return b.fameRate - a.fameRate; // Sort by age in ascending order
		};
		array.sort(compare);
	}
	return array;
}

function sortByLocalization(
	array: SortingCriteria[] | ReducedProfileInfo[],
	order: 'closest' | 'none'
) {
	if (order == 'closest') {
		const compare = (
			a: SortingCriteria | ReducedProfileInfo,
			b: SortingCriteria | ReducedProfileInfo
		) => {
			return a.localisation - b.localisation; // Sort by age in ascending order
		};
		array.sort(compare);
	}
	return array;
}

function applyfilter(
	array: SortingCriteria[] | ReducedProfileInfo[],
	ageRange: [number, number],
	fameRange: [number, number],
	excludeTag: string[]
) {
	const filter = (
		value: SortingCriteria | ReducedProfileInfo,
		index: number,
		array: SortingCriteria[] | ReducedProfileInfo[]
	) => {
		if (
			value.fameRate >= fameRange[0] &&
			value.fameRate <= fameRange[1] &&
			value.age >= ageRange[0] &&
			value.age <= ageRange[1] &&
			!value.tags.some((tag) => excludeTag.includes(tag))
		) {
			array[index].mask = true;
		} else {
			array[index].mask = false;
		}
	};
	array.forEach(filter);
	return array;
}

export { sortByfameRate, sortByAge, sortByLocalization, applyfilter };
export type { SortingCriteria };
