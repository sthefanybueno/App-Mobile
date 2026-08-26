import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, View } from "react-native";
import { Observation } from "@/src/domain/entities/Observation";
import { container } from "@/src/fectorie/container";

export default function List() {
  const [list, setList] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    container.listObservations.execute().then((res) => { //then é a mesma coisa de usar async/await
      console.log(res)
      if (active) {
        setList(res)
      }
    }).finally(() => {
     setLoading(false)
    })
    return () => {active = false;}
  }, [])

    const renderItem = ({ item }: { item: Observation }) => {
        return (
            <View style={styles.container}>
                <Image source={{ uri: item.photo }} resizeMode="cover" style={{ width: 100, height: 100}}/>
                <View>
                    <Text>{item.photo}</Text>
                    <Text>{item.coordinates.latitude}</Text>
                    <Text>{item.coordinates.longitude}</Text>
                </View>
            </View>
        )
    }

  return (
    <View style={styles.container}>
      {loading ? (
          <ActivityIndicator size="large" color="#000" />
        ) : (
          <FlatList
            data={list}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
          />
        )
      }
    </View>
  )
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        gap: 12,
    },
})