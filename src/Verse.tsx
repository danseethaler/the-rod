import * as Clipboard from 'expo-clipboard';
import React from 'react';
import {Linking, Pressable, Text, View} from 'react-native';
import {colors} from './config/theme';
import {StandardWorksFlatVerse} from './data/data.types';
import {buildCopyText, buildUrl} from './utils/urlHelpers.utils';
import {Feather} from '@expo/vector-icons';

interface Props {
  verse: StandardWorksFlatVerse;
  searchString: string;
}

const Verse = ({verse, searchString}: Props) => {
  const verseParts = verse.text.toLowerCase().split(searchString.toLowerCase());

  return (
    <View
      style={{
        backgroundColor: colors.cardGray,
        borderRadius: 16,
        marginBottom: 16,
        marginHorizontal: 16,
        padding: 16,
      }}
    >
      <Pressable onPress={() => Clipboard.setString(buildCopyText(verse))}>
        <Text
          style={{
            color: colors.text,
            fontWeight: '800',
          }}
        >
          {verse.reference}
        </Text>
        <Text
          style={{
            color: colors.text,
            paddingVertical: 8,
            fontSize: 16,
            lineHeight: 22,
          }}
        >
          {verseParts.map((textPart, index) => {
            if (verseParts.length - 1 === index) {
              return textPart;
            }

            return (
              <React.Fragment key={index}>
                {textPart}
                <Text
                  style={{
                    color: colors.background,
                    backgroundColor: colors.linkBackground,
                    fontWeight: 'bold',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  {searchString.toLowerCase()}
                </Text>
              </React.Fragment>
            );
          })}
        </Text>
      </Pressable>
      <Pressable
        style={{
          marginVertical: 8,
          borderRadius: 8,
          padding: 16,
          paddingVertical: 12,
          backgroundColor: colors.background,
          justifyContent: 'space-between',
          flexDirection: 'row',
          alignItems: 'center',
        }}
        onPress={() => Linking.openURL(buildUrl(verse))}
      >
        <Text style={{color: colors.linkBackground, fontWeight: '600'}}>
          Open
        </Text>
        <Feather name="external-link" size={18} color={colors.linkBackground} />
      </Pressable>
    </View>
  );
};

export default Verse;
