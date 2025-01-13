enum Gender {
	MAN = 'man',
	WOMAN = 'woman',
	OTHER = 'other'
}

function isGender(value: string): value is Gender {
	return Object.values(Gender).includes(value as Gender);
}

function isSexualPreference(value: string): value is SexualPreference {
	return Object.values(SexualPreference).includes(value as SexualPreference);
}

enum SexualPreference {
	MEN = 'men',
	WOMEN = 'women',
	ALL = 'all',
	OTHER = 'other'
}

type ProfileInfo = {
	userId: string;
	firstName: string;
	lastName: string;
	gender: Gender;
	sexualPreference: SexualPreference;
	biography: string;
	age: number;
	tags: string[];
	uploadedPictures: number[];
};

function initials(profileInfo: ProfileInfo): string {
	return (profileInfo.firstName[0] + profileInfo.lastName[0]).toUpperCase();
}

export { Gender, SexualPreference, isSexualPreference, isGender, initials };
export type { ProfileInfo };
