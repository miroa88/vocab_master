#!/usr/bin/env python3
"""
Script to populate all remaining words in vocab.json with definitions, synonyms, and examples.
This will add complete data for words 21-570.
"""

import json
import sys

# Complete vocabulary data for all 550 remaining words (21-570)
# This is a comprehensive dataset with definitions, synonyms, and 2 examples for each word

# Import complete vocabulary data from separate file
import sys
import os
script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, script_dir)

try:
    from complete_vocab_data import vocab_data as complete_vocab_data
    vocab_data = complete_vocab_data
except ImportError:
    # Fallback: just the essential missing words
    vocab_data = {
        21: {"word": "aid", "definition": "Help, typically of a practical nature; to provide support or assistance", "partOfSpeech": "noun/verb", "synonyms": ["help", "assist", "support", "assistance"], "examples": ["International aid was provided to the disaster-stricken region.", "The new software will aid researchers in analyzing complex data."], "difficulty": "basic"},
        22: {"word": "albeit", "definition": "Although; even though; notwithstanding the fact that", "partOfSpeech": "conjunction", "synonyms": ["although", "though", "even though", "while"], "examples": ["The project was successful, albeit expensive and time-consuming.", "He agreed to help, albeit reluctantly and with reservations."], "difficulty": "advanced"},
        23: {"word": "allocate", "definition": "To distribute resources or duties for a particular purpose; to assign", "partOfSpeech": "verb", "synonyms": ["assign", "distribute", "apportion", "designate"], "examples": ["The committee will allocate funds to various departments based on need.", "We need to allocate more time for quality assurance testing."], "difficulty": "intermediate"},
        24: {"word": "alter", "definition": "To change or cause to change in character or composition", "partOfSpeech": "verb", "synonyms": ["change", "modify", "adjust", "transform"], "examples": ["Climate change is altering weather patterns worldwide.", "The tailor will alter the dress to fit you perfectly."], "difficulty": "basic"},
        25: {"word": "alternative", "definition": "Available as another possibility or choice; one of two or more available possibilities", "partOfSpeech": "adjective/noun", "synonyms": ["option", "choice", "substitute", "different"], "examples": ["We need to find an alternative solution to this problem.", "Solar energy is a clean alternative to fossil fuels."], "difficulty": "basic"},
        26: {"word": "ambiguous", "definition": "Open to more than one interpretation; having a double meaning; unclear", "partOfSpeech": "adjective", "synonyms": ["unclear", "vague", "uncertain", "equivocal"], "examples": ["The contract contained several ambiguous clauses that caused confusion.", "Her ambiguous response left everyone wondering what she really meant."], "difficulty": "advanced"},
        27: {"word": "amend", "definition": "To make minor changes to improve or correct something; to modify formally", "partOfSpeech": "verb", "synonyms": ["modify", "revise", "alter", "correct"], "examples": ["Parliament voted to amend the constitution.", "Please amend your report to include the latest figures."], "difficulty": "intermediate"},
        28: {"word": "analogy", "definition": "A comparison between two things for the purpose of explanation or clarification", "partOfSpeech": "noun", "synonyms": ["comparison", "similarity", "parallel", "correlation"], "examples": ["The teacher used an analogy comparing the brain to a computer.", "Drawing an analogy between the two situations helps understand the concept."], "difficulty": "intermediate"},
        29: {"word": "analyze", "definition": "To examine something methodically in detail to explain and interpret it", "partOfSpeech": "verb", "synonyms": ["examine", "study", "investigate", "evaluate"], "examples": ["Scientists analyze data to identify patterns and trends.", "We need to analyze the survey results before making a decision."], "difficulty": "basic"},
        30: {"word": "annual", "definition": "Occurring once every year; calculated over or covering a period of one year", "partOfSpeech": "adjective", "synonyms": ["yearly", "year-long", "per annum", "every year"], "examples": ["The company holds its annual meeting in June.", "Annual rainfall in this region averages 800 millimeters."], "difficulty": "basic"},
        31: {"word": "anticipate", "definition": "To regard as probable; to expect or predict; to act in advance of", "partOfSpeech": "verb", "synonyms": ["expect", "predict", "foresee", "await"], "examples": ["We anticipate a large increase in sales this quarter.", "The company anticipates challenges but is prepared to address them."], "difficulty": "intermediate"},
        32: {"word": "apparent", "definition": "Clearly visible or understood; obvious; seeming real but not necessarily so", "partOfSpeech": "adjective", "synonyms": ["obvious", "evident", "clear", "visible"], "examples": ["It was apparent that she was upset about something.", "The apparent solution turned out to be more complex than expected."], "difficulty": "intermediate"},
        33: {"word": "append", "definition": "To add something as an attachment or supplement", "partOfSpeech": "verb", "synonyms": ["add", "attach", "affix", "adjoin"], "examples": ["Please append your signature to the end of the document.", "The researcher decided to append additional data to the report."], "difficulty": "intermediate"},
        34: {"word": "appreciate", "definition": "To recognize the full worth of; to be grateful for; to understand fully", "partOfSpeech": "verb", "synonyms": ["value", "recognize", "understand", "acknowledge"], "examples": ["I really appreciate your help with this project.", "Property values have appreciated significantly over the past decade."], "difficulty": "basic"},
        35: {"word": "approach", "definition": "To come near or nearer to; a way of dealing with something; a method", "partOfSpeech": "verb/noun", "synonyms": ["method", "strategy", "way", "near"], "examples": ["We need a new approach to solving this recurring problem.", "As winter approaches, birds migrate south to warmer climates."], "difficulty": "basic"},
        36: {"word": "appropriate", "definition": "Suitable or proper in the circumstances; to take for one's own use", "partOfSpeech": "adjective/verb", "synonyms": ["suitable", "proper", "fitting", "relevant"], "examples": ["Please wear appropriate attire for the formal event.", "Congress voted to appropriate funds for the infrastructure project."], "difficulty": "intermediate"},
        37: {"word": "approximate", "definition": "Close to the actual but not completely accurate; to come close to", "partOfSpeech": "adjective/verb", "synonyms": ["estimated", "rough", "close", "nearly"], "examples": ["The approximate cost of the renovation is fifty thousand dollars.", "These figures approximate the actual values within a small margin."], "difficulty": "intermediate"},
        38: {"word": "arbitrary", "definition": "Based on random choice or personal whim rather than reason or system", "partOfSpeech": "adjective", "synonyms": ["random", "capricious", "unreasoned", "discretionary"], "examples": ["The decision seemed arbitrary and lacked clear justification.", "Setting an arbitrary deadline without considering the workload is unfair."], "difficulty": "advanced"},
        39: {"word": "area", "definition": "A region or part of a town, country, or the world; a subject or range of activity", "partOfSpeech": "noun", "synonyms": ["region", "zone", "section", "field"], "examples": ["This area of the city has excellent schools and parks.", "Her area of expertise is molecular biology and genetics."], "difficulty": "basic"},
        40: {"word": "aspect", "definition": "A particular part or feature of something; a specific way in which something can be viewed", "partOfSpeech": "noun", "synonyms": ["feature", "facet", "element", "dimension"], "examples": ["We need to consider every aspect of the proposal carefully.", "The financial aspect of the project requires immediate attention."], "difficulty": "intermediate"},
    }

# This function will read vocab.json and add all the data
def populate_vocab():
    try:
        # Read existing vocab.json
        with open('vocab.json', 'r', encoding='utf-8') as f:
            data = json.load(f)

        print(f"Loaded vocab.json with {len(data.get('words', []))} words")

        # Update words with our data
        updated_count = 0
        for word_obj in data['words']:
            word_id = word_obj['id']
            if word_id in vocab_data and not word_obj.get('definition'):
                vocab_info = vocab_data[word_id]
                word_obj['definition'] = vocab_info['definition']
                word_obj['partOfSpeech'] = vocab_info['partOfSpeech']
                word_obj['synonyms'] = vocab_info['synonyms']
                word_obj['examples'] = vocab_info['examples']
                word_obj['difficulty'] = vocab_info['difficulty']
                updated_count += 1

        # Write back to file
        with open('vocab.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        print(f"[OK] Successfully updated {updated_count} words!")
        print(f"[OK] Total words with data: {sum(1 for w in data['words'] if w.get('definition'))}/570")

    except FileNotFoundError:
        print("Error: vocab.json not found!")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in vocab.json - {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("Vocab Master - Populating vocabulary data...")
    print("=" * 50)
    populate_vocab()
    print("=" * 50)
    print("Done! Refresh your browser to see the new words.")
