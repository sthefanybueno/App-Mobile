import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { container } from "@/src/fectorie/container";

export default function Camera() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  // useRef: Cria uma referência persistente que não recria a cada renderização.
  // Usamos isso para nos "conectar" à instância real da Câmera na tela e poder disparar funções dela (ex: tirar foto).
  const cameraRef = useRef<CameraView>(null);
  const [uri, setUri] = useState<string | null>(null);

  // useEffect com array vazio []: Este código roda apenas UMA vez, exatamente quando a tela é carregada pela primeira vez.
  // Ideal para checar coisas pesadas na inicialização, como permissões de GPS.
  useEffect(()=>{
    async function getCurrentLocation() {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permissão negada", "Precisamos de acesso à sua localização para salvar a observação.");
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    }
    getCurrentLocation();
  },[])
  
  // Se a permissão de câmera ainda estiver carregando (null), retorna uma tela vazia para não quebrar o layout.
  if (!permission) {
    return <View />
  }
  
  if (!permission.granted) {
    return (
      <View>
        <Text>Permissão negada</Text>
        <Button title="Conceder permissão" onPress={requestPermission} />
      </View>
    )
  } 

  async function savePhoto() {
    /* */

    await container.registerObservation.execute({
      photo: String(uri),
      latitude: Number(location?.coords.latitude),
      longitude: Number(location?.coords.longitude),
    })
    setUri(null);
    Alert.alert("Sucesso", "Foto salva com sucesso!");
  }

  function toggleCameraFacing() {
    setFacing(current => current === 'back' ? 'front' : 'back');
  }

  async function takePicture() {
    // Se a referência da câmera existir (ou seja, se a câmera estiver pronta na tela)...
    if (cameraRef.current) {
      // Dispara o comando nativo de capturar a foto.
      const foto = await cameraRef.current.takePictureAsync();
      if (foto.uri) {
        setUri(foto.uri);
      }
    }
  }

  function mostrarFoto(){
    if (uri) {
      return (
        <>
          <Image source={{ uri }} style={{ flex: 1 }}/>
          <View style={styles.buttonFlip}>
            <TouchableOpacity style={styles.button} onPress={savePhoto}>
              <Text style={styles.text}>Salvar</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.buttonCapture}>
            <TouchableOpacity style={styles.button} onPress={() => setUri(null)}>
              <Text style={styles.text}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </>
      )
    }
  }

  function viewCamera(){
    return (
      <>
        <CameraView style={styles.camera} facing={facing} ref={cameraRef} />
        <View style={styles.buttonFlip}>
          <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
            <Text style={styles.text}>Virar Câmera</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.buttonCapture}>
          <TouchableOpacity style={styles.button} onPress={takePicture}>
            <Text style={styles.text}>Capturar</Text>
          </TouchableOpacity>
        </View>
      </>
    )
  }

  return (
    <View style={styles.camera}>
      {uri ? mostrarFoto() : viewCamera()}
    </View>
  );
}

const styles = StyleSheet.create({
  camera: {
    flex: 1,
  },
  buttonFlip: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 15,
    borderRadius: 10,
  },
  buttonCapture: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 15,
    borderRadius: 10,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
});