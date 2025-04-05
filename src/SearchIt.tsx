import { AntDesign, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useReducer, useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { colors } from "./config/theme";
import { StandardWorksFlatVerse } from "./data/data.types";
import useFilterItems from "./utils/useFilterItems";
import Verse from "./Verse";

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

  const filterAllVerses = useFilterItems();

  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
      inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const visibleNew = filterAllVerses(searchString, wholeWord);
    setVisible(visibleNew);
  }, [searchString, wholeWord]);

  return (
    <View style={{ flex: 1, alignSelf: "stretch" }}>
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
          placeholderTextColor={colors.text}
          ref={inputRef}
          autoFocus
          style={{
            paddingVertical: 12,
            paddingHorizontal: 16,
            flex: 1,
            fontSize: 18,
            backgroundColor: colors.cardGray,
            borderTopLeftRadius: 8,
            borderBottomLeftRadius: 8,
            color: colors.white,
            fontWeight: "500",
          }}
          onChangeText={(newSearch) => setSearchString(newSearch)}
        />
        <Pressable
          onPress={() => {
            setSearchString("");
            inputRef.current?.focus();
          }}
          style={{
            padding: 10.5,
            backgroundColor: colors.cardGray,
            borderLeftWidth: 1,
            borderColor: colors.background,
            borderTopRightRadius: 8,
            borderBottomRightRadius: 8,
          }}
        >
          <AntDesign
            color={colors.linkBackground}
            name="closecircle"
            size={22}
          />
        </Pressable>
        {/* <Pressable
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
        </Pressable> */}
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
