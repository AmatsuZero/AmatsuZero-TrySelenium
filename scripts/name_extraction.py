import spacy
import sys

nlp = spacy.load("ja_core_news_sm")

def extract(title):
  doc = nlp(title)
  lastNames = []
  firstNames = []
  for token in doc:
    if token.tag_ == '名詞-固有名詞-人名-姓':
      lastNames.append(token.text)
    elif token.tag_ == '名詞-固有名詞-人名-名':
      firstNames.append(token.text)
  names = []
  if len(lastNames) == len(firstNames):
    for i in range(len(lastNames)):
      names.append(lastNames[i] + firstNames[i])
  print(names)
  sys.stdout.flush()

extract(sys.argv[1])