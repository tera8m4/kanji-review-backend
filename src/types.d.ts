export interface Word {
    value: string;
    reading: string;
    translation: string;
}

export interface ReviewState {
    last_review_time: Date;
    next_review_time: Date;
    stage: number;
    incorrect_streak: number;
}

export interface Kanji {
    _id?: string;
    character: string;
    readings: string[];
    words: Word[];
    review_state: ReviewState;
}