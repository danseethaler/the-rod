import { AntDesign, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { colors } from "./config/theme";
import { getAllFlatVerses } from "./data/conversion.utils";
import { StandardWorksFlatVerse } from "./data/data.types";
import filterItems from "./utils/filterItems";
import Verse from "./Verse";

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
  const [wholeWord, setWholeWord] = useState(false);
  const [searchString, setSearchString] = useState("");

  useEffect(() => {
    const visibleNew = filterAllVerses(searchString, wholeWord);
    setVisible(visibleNew);
  }, [searchString, wholeWord]);

  return (
    <View style={{ alignSelf: "stretch" }}>
      <View
        style={{
          padding: 12,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <TextInput
          keyboardAppearance="dark"
          value={searchString}
          placeholder="O be wise…"
          placeholderTextColor="#555"
          style={{
            padding: 12,
            flex: 1,
            fontSize: 18,
            backgroundColor: "#ddf",
            borderTopLeftRadius: 8,
            borderBottomLeftRadius: 8,
          }}
          onChangeText={(newSearch) => setSearchString(newSearch)}
        />
        <Pressable
          onPress={() => setSearchString("")}
          style={{
            padding: 12,
            backgroundColor: "#ddf",
            borderLeftWidth: 1,
            borderColor: colors.cardGray,
          }}
        >
          <AntDesign color={colors.cardGray} name="closecircle" size={22} />
        </Pressable>
        <Pressable
          style={{
            padding: 12,
            backgroundColor: wholeWord ? "#dff" : "#ddf",
            borderTopRightRadius: 8,
            borderBottomRightRadius: 8,
            borderLeftWidth: 1,
            borderColor: colors.cardGray,
          }}
          onPress={() => setWholeWord(!wholeWord)}
        >
          <MaterialCommunityIcons
            color={colors.cardGray}
            name={wholeWord ? "card-text" : "card-text-outline"}
            size={22}
          />
        </Pressable>
      </View>
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
