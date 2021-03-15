import React, { useEffect, useState } from "react";
import { Dimensions, ScrollView, Text, TextInput, View } from "react-native";
import { colors } from "./config/theme";
import { getAllFlatVerses } from "./data/conversion.utils";
import { StandardWorksFlatVerse } from "./data/data.types";
import filterItems from "./utils/filterItems";
import Verse from "./Verse";

const screenWidth = Dimensions.get("screen").width;

const filterAllVerses = filterItems(getAllFlatVerses());

interface SearchItState {
  verses: StandardWorksFlatVerse[];
  resultCount: number;
  duration: number;
}

const SearchIt = () => {
  const [visible, setVisible] = useState<SearchItState>({
    verses: [],
    resultCount: 0,
    duration: 0,
  });
  const [searchString, setSearchString] = useState("");

  useEffect(() => {
    const visibleNew = filterAllVerses(searchString);
    setVisible(visibleNew);
  }, [searchString]);

  return (
    <View>
      <TextInput
        keyboardAppearance="dark"
        value={searchString}
        placeholder="O be wise…"
        placeholderTextColor="#555"
        style={{
          padding: 12,
          margin: 16,
          fontSize: 18,
          backgroundColor: "#ddf",
          width: screenWidth - 32,
          borderRadius: 8,
        }}
        clearButtonMode="while-editing"
        onChangeText={(newSearch) => setSearchString(newSearch)}
      />
      <ScrollView keyboardShouldPersistTaps="handled">
        <Text
          style={{ color: colors.text, padding: 16, alignSelf: "flex-end" }}
        >
          {visible.resultCount} Results in {visible.duration}ms
        </Text>
        {visible.verses.map((verse) => (
          <Verse
            key={verse.reference}
            verse={verse}
            searchString={searchString}
          />
        ))}
      </ScrollView>
    </View>
  );
};

export default SearchIt;
